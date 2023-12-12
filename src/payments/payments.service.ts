import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import {createClient, type ClientConfig} from '@sanity/client'
import axios from 'axios';
import fetch from 'cross-fetch';
import { AuthService } from '../auth/auth.service';
import { ChargeDto, ChargeForProduct, SubscribeDto } from './payments.dto';
import * as fs from 'fs/promises'
import { createWriteStream } from 'fs';
import { Readable, Writable } from 'stream';
import * as path from 'path';
import * as  PDFDocument from 'pdfkit'

@Injectable()
export class PaymentsService {
	constructor(
		private config: ConfigService,
		private db: DatabaseService,
		private authService: AuthService,
	) {}

	private sanity = createClient({
		projectId: this.config.get('SANITY_PROJECT'),
		dataset: this.config.get('SANITY_DATASET'),
		useCdn: true,
		apiVersion: '2023-05-03',
		perspective: 'published',
	})

	private key = this.config.get('PAYSTACK_KEY');
	private paystackHost = 'https://api.paystack.co';
	private readonly baseUrl: string = this.config.get('HOST_URL');

	async payAnyAmount(amount: number, email: string) {
		const price = new Decimal(amount * 100).toString();

		try {
			const payInit =  await axios({
				method: 'post',
				url: `${this.paystackHost}/transaction/initialize`,
				data: {
					amount: price,
					currency: 'ZAR',
					email: email
				},
				headers: {
					"Authorization": `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})

			return payInit.data.data
		} catch (err: any) {
			// console.log(err)
			throw new BadRequestException('Could not initiate payment');
		}
	}

	async chargeForProduct(data: ChargeForProduct) {
		let rawAmount = 0;
		const reference = 'Marginal-'+data.userUid+'-'+new Date().toISOString();
		try {
			const [user] = await this.db.get(this.db.key(['User', data.userUid]));
			const userRecords = await this.authService.getUserInfo(data.userUid);
			let productName: string;

			if(data.type === 'article'){

				const [alreadyBought] = await this.db.createQuery('Product').filter('user', '=', data.userUid).filter('type', '=', 'article').filter('articleId', '=', data.articleId).run();
				if(alreadyBought.length > 0){
					throw new BadRequestException('You have already bought this article')
				}

				const article = await this.sanity.fetch(`*[_type=="article" && _id=="${data.articleId}"] { heading }`)
				if(article.length === 0){ throw new BadRequestException('Article does not exist') }
				productName = article[0].heading;
				rawAmount = 39;

			} else if(data.type === 'plan') {

				productName = data.accessValidity === 'month' ? 'Marginal 30 Days Access' : 'Marginal 365 Days Access';
				rawAmount = data.accessValidity === 'month' ? 159 : 1368;

			} else if(data.type === 'prorate'){

				await this.getSubscription(userRecords.uid) // It will throw an error if a subscription doesn't exist or isn't active
				if(!data.proratedDays){ throw new BadRequestException('Provide number of days to prorate') }

				productName = `Loaded ${data.proratedDays}'s Worth of Subscription Credit`;
				rawAmount = data.proratedDays*5

			}

			const entity = {
				key: this.db.key('Product'),
				data: {
					user: data.userUid,
					articleId: data.articleId,
					type: data.type,
					receiverEmail: data.receiverEmail,
					redeemedByReceiver: false,
					proratedDays: data.proratedDays,
					date: new Date().toISOString(),
					price: rawAmount,
					currency: 'ZAR',
					reference: reference,
					verified: false,
					title: productName,
					accessValidity: data.accessValidity
				}
			}

			// entity clean up
			if(data.type !== 'article'){delete entity.data.articleId}
			if(data.type !== 'plan'){delete entity.data.receiverEmail; delete entity.data.redeemedByReceiver; delete entity.data.accessValidity}
			if(data.type !== 'prorate'){delete entity.data.proratedDays}
			
			// Charge
			const price = new Decimal(rawAmount*100).toString();

			if(data.firstCharge === true){
				const payInit =  await axios({
					method: 'post',
					url: `${this.paystackHost}/transaction/initialize`,
					data: {
						amount: price,
						currency: 'ZAR',
						'first_name': user.firstName,
						'last_name': user.lastName,
						email: userRecords.email,
						reference: reference,
						'callback_url': `${this.baseUrl}/payments/verify?ref=${reference}&redirect=${data.redirect}`,
						channels: ['card']
					},
					headers: {
						"Authorization": `Bearer ${this.key}`,
						"Content-Type": 'application/json'
					},
					responseType: 'json'
				})
				
				await this.db.save(entity);
				return {path: payInit.data.data['authorization_url']}
			} else {
				const customerData = await this.getCustomer(data.userUid);
				const chargeAuthCode = customerData.authorizations[0]['authorization_code'];

				const charge = await this.charge({
					reference: reference,
					authCode: chargeAuthCode,
					price: price,
					email: userRecords.email
				})

				await this.db.save(entity);
				return {path : `/payments/verify?ref=${reference}&redirect=${data.redirect}`}
			}
		} catch (err: any) {
			throw new BadRequestException('Could not initiate subscription');
		}
	}

	async charge(data: ChargeDto){
		try {
			const charge =  await axios({
				method: 'post',
				url: `${this.paystackHost}/transaction/charge_authorization`,
				data: {
					amount: data.price,
					currency: 'ZAR',
					email: data.email,
					reference: data.reference,
					'authorization_code': data.authCode
				},
				headers: {
					"Authorization": `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})
			return charge.data.data
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async verifyTransaction(ref: string, redirect?: string){
		try {
			const verifyPay = await axios({
				method: 'get',
				url: `${this.paystackHost}/transaction/verify/${ref}`,
				headers: {
					'Authorization': `Bearer ${this.key}`,
				},
				responseType: 'json'
			})

			if(redirect){
				// If a redirect path or url is given create a receipt of the transaction
				// And this means we're dealing with a product transaction
				const transaction = verifyPay.data.data;
				const userRecords = await this.authService.getAuth().getUserByEmail(transaction.customer.email);
				const [subscription] = await this.db.get(this.db.key(['Subscription', userRecords.uid]));
				const [results] = await this.db.createQuery('Product').filter('verified', '=', false).filter('user', '=', userRecords.uid).filter('reference', '=', ref).run()
				if(results.length){ throw new NotFoundException('Invalid reference') }
				const productId = results[0][this.db.KEY]['id'];
				const product = results[0]
				product.verified = true;
				
				await this.createReceipt(transaction, true, product.title, productId);
				await this.db.update(product);

				// Activate products bought if they belong to the current user
				if(product.type === 'prorate'){

					subscription.nextBillingDate = new Date (Number(new Date(subscription.nextBillingDate))+(1000*60*60*24*product.proratedDays)).toISOString()
					await this.db.update(subscription);

				} else if(product.type === 'plan'){

					if(product.receiverEmail === userRecords.email){
						const expiryDate = Number(new Date(subscription.subscriptionPassExpiryDate))
						const daysOfValidity = product.accessValidity === 'month' ? 30 : 365;
						subscription.subscriptionPass = true;
						subscription.subscriptionPassExpiryDate = expiryDate > Date.now() ? new Date(expiryDate+1000*60*60*24*daysOfValidity).toISOString() : new Date(Date.now()+1000*60*60*24*daysOfValidity).toISOString()
						await this.db.update(subscription);
					} else {
						// Notify the intended party
					}
				}

				return {path: redirect}
			} else {
				// If a redirect path or url isn't given, receipt creation will be handled elsewhere
				// And this means we're dealing with a subscription transaction
				return verifyPay.data.data
			}
		} catch(err: any) {
			// console.log(err.message)
			throw new BadRequestException('Could not be verified');
		}
	}

	async authPayment(userUid: string, cycle: string, code?: string) {
		const price = new Decimal(2 * 100).toString();
		const reference = userUid+'-'+Date.now();
		try {
			const [user] = await this.db.get(this.db.key(['User', userUid]));
			const userRecords = await this.authService.getUserInfo(userUid);
			
			const payInit =  await axios({
				method: 'post',
				url: `${this.paystackHost}/transaction/initialize`,
				data: {
					amount: price,
					currency: 'ZAR',
					'first_name': user.firstName,
					'last_name': user.lastName,
					email: userRecords.email,
					reference: reference,
					'callback_url': `${this.baseUrl}/payments/subscription/create?ref=${reference}&cycle=${cycle}${code ? `&code=${code}` : ''}`,
					channels: ['card']
				},
				headers: {
					"Authorization": `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})
			
			return payInit.data.data
		} catch (err: any) {
			console.log(err)
			throw new BadRequestException('Could not initiate subscription');
		}
	}

	// TODO: Separate subscription creation, subscription up/downgrade and card change

	async subscribe(data: SubscribeDto){
		const now = new Date().toISOString();
		let rawAmount = data.monthly === true ? 145 : 1199;
		let trialDays = 14;
		try {
			const transaction = data.reference ? await this.verifyTransaction(data.reference) : null;
			// const customer = await this.getCustomer(data.userUid);
			// const chargeAuthCode = customer.authorizations[0]['authorization_code'];
			const userRecords = await this.authService.getAuth().getUserByEmail(transaction.customer.email)
			const [subscription] = await this.db.get(this.db.key(['Subscription', userRecords.uid]));

			if(subscription){
				// If a customer has had a subscription before, they are not legible for a free trial
				trialDays = 0;
				const reference = userRecords.uid+Date.now();
				const cycle = data.monthly === true ? 'monthly' : 'annual'

				if(subscription.subscriptionPass === true && Number(new Date(subscription.subscriptionPassExpiryDate)) > Number(new Date(now))){
					// If the customer has an active pass
					subscription.nextBillingDate = subscription.subscriptionPassExpiryDate;
					subscription.price = new Decimal(rawAmount * 100).toString();
					subscription.createdAt = now;
					subscription.billingAuthorization = transaction.authorization['authorization_code'];
					subscription.verificationTransactionReference = transaction.reference;
					subscription.status = 'active';
					subscription.cycle = cycle;
					subscription.freeTrialDays = trialDays;

				
					await this.charge({
						price: subscription.price,
						email: userRecords.email,
						reference: reference,
						authCode: subscription.billingAuthorization
					});

					await this.db.update(subscription)
					
					await this.createReceipt(transaction, false, `Marginal ${cycle} plan`)

					return {
						createdAt: subscription.createdAt,
						amount: subscription.price,
						status: subscription.status,
						cycle: subscription.cycle,
						nextBillingDate: subscription.nextBillingDate
					}
					
				} else if(subscription.status === 'active' ){
					// If a user has an active subscription handle upgrade or downgrade

					// However, a user cannot resubscribe to their current active subscription
					if(subscription.cycle === cycle){ throw new BadRequestException('You already have a similar active subscription') }

					// Downgrade
					if(subscription.cycle === 'annual' && cycle === 'monthly'){

					}

				} else {}

			} else {

				const [promo] = await this.db.get(this.db.key(['Promotion', code]));

				const subscriptionEntity = {
					key: this.db.key(['Subscription', userRecords.uid]),
					data: {
						cycle: monthly === true ? 'monthly' : 'annual',
						status: 'active',
						freeTrialDays: 0,
						createdAt: now,
						nextBillingDate: now,
						lastBillingDate: now,
						price: rawAmount,
						billingNumber: 0,
						billingPriceSum: 0,
						billingAuthorization: transaction.authorization['authorization_code'],
						subscriptionPass: false,
						subscriptionPassExpiryDate: now,
						verificationTransactionReference: transaction.reference
					}
				}

			}			
			
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async subscribeMembership(monthly: boolean, ref: string, code?: string) {
		const now = Date.now()
		let trialDays = 14;	// Default free trial	
		const promoEntity = []
		try {
			const transactionData = await this.verifyTransaction(ref);

			const userRecords = await this.authService.getAuth().getUserByEmail(transactionData.customer.email)
			const [subscription] = await this.db.get(this.db.key(['Subscription', userRecords.uid]));

			if(subscription){ 
				if(subscription.cycle === 'annual' && monthly === true && subscription.status === 'active'){
					// If a user has an active annual subscription, they cannot downgrade to a monthly subscription
					throw new BadRequestException('You have an active annual subscription')
				} else if(subscription.cycle === 'monthly' && monthly === true){
					// If a user has a monthly subscription, active or otherwise, they cannot create another monthly subscription
					throw new BadRequestException('You have an existing subscription that is either active or inactive')
				} else if(subscription.cycle === 'annual' && monthly === false){
					// If a user has an annual subscription, active or otherwise, they cannot create another annual subscription
					throw new BadRequestException('You have an existing subscription that is either active or inactive')
				} else if(subscription.cycle === 'monthly' && monthly === false){
					// If a user has a monthly subscription, active or otherwise, they can create an annual subscription
					const current = await this.getSubscription(userRecords.uid);

					if(subscription.status === 'active'){
						const prorate = Math.round(Number(new Date(current['next_payment_date'])) - now)
						trialDays = prorate <= 0 ? 0 : prorate
						code = ''
						await this.disableMembership(userRecords.uid);
					} else {
						trialDays = 0
						code = ''
					}
				} else {
					trialDays = 0
					code = ''
				}
			}
			
			if(code){
				const [promo] = await this.db.get(this.db.key(['TrialCode', code]));
				if(!promo){throw new BadRequestException('Invalid promo code')}
				if( Number(new Date(promo.expiresAt)) > now ){ throw new BadRequestException('Promo code has expired') }
				if(promo.usage >= promo.validity){ throw new BadRequestException('Promo code already used') }
				trialDays = promo.days
				promo.usage = promo.usage+1
				promoEntity.push(promo)
			}

			const startDate = new Date(now+(1000*60*60*24*trialDays)).toISOString()
			
			const subscribe = await axios({
				method: 'post',
				url: `${this.paystackHost}/subscription`,
				data: {
					plan: monthly === true ? this.config.get('MARGINAL_MONTHLY_CODE') : this.config.get('MARGINAL_ANNUAL_CODE'),
					customer: userRecords.email,
					'start_date': startDate
				},
				headers: {
					Authorization: `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})

			if (subscribe.data.status !== true) {
        throw new BadRequestException('Subscription unsuccessful');
      } else {
				if(promoEntity.length > 0){
					await this.db.update(promoEntity[0]);
				}

				if(subscription) {
					subscription.status = subscribe.data.data.status
					if(monthly === true){
						subscription.cycle = 'monthly'
						subscription.monthlyCode = subscribe.data.data.subscription_code,
						subscription.monthlyEmailToken = subscribe.data.data.email_token;
					} else {
						subscription.cycle = 'annual'
						subscription.monthlyCode = subscribe.data.data.subscription_code,
						subscription.monthlyEmailToken = subscribe.data.data.email_token;
					}

					await this.db.update(subscription);
				} else {
					const subscriptionEntity = {
						key: this.db.key(['Subscription', userRecords.uid]),
						data: {
							cycle: monthly === true ? 'monthly' : 'annual',
							status: subscribe.data.data.status,
							monthlyCode: monthly === true ? subscribe.data.data.subscription_code : null,
							monthlyEmailToken: monthly === true ? subscribe.data.data.email_token : null,
							annualCode: monthly === true ? null : subscribe.data.data.subscription_code,
							annualEmailToken: monthly === true ? null : subscribe.data.data.email_token
						}
					}

					await this.db.insert(subscriptionEntity);
				}

        return { status: 'success' };
      }
		} catch (err: any) {
			console.log(err)
			throw new BadRequestException('Subscription attempt was unsuccessful')
		}
	}

	// TODO: Combine the subscription enable and disable methods

	async disableMembership(userUid: string) {
		try {
			const [sub] = await this.db.get(this.db.key(['Subscription', userUid]));

			if(!sub){ throw new BadRequestException('You have no subscription') }
			if(sub.status !== 'active'){ throw new BadRequestException('You have no active subscription') }

			const code = sub.cycle === 'monthly' ? sub.monthlyCode : sub.annualCode
			const token = sub.cycle === 'monthly' ? sub.monthlyEmailToken : sub.annualEmailToken

			const unsubscribe = await axios({
				method: 'post',
				url: `${this.paystackHost}/subscription/disable`,
				data: {
					code: code,
					token: token
				},
				headers: {
					Authorization: `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})

			if (unsubscribe.data.status !== true) {
				sub.status = 'inactive';
				await this.db.update(sub.status);
				throw new BadRequestException('Unsubscription unsuccessful');
			} else {
				return { status: 'success' };
			}
		} catch(err: any){
			console.log(err)
			throw new BadRequestException('Could not disable subscription')
		}
	}

	async enableMembership(userUid: string) {
		try {
			const [sub] = await this.db.get(this.db.key(['Subscription', userUid]));

			if(!sub){ throw new BadRequestException('You have no subscription') }
			if(sub.status === 'active'){ throw new BadRequestException('Your subscription is already active') }

			const code = sub.cycle === 'monthly' ? sub.monthlyCode : sub.annualCode;
			const token = sub.cycle === 'monthly' ? sub.monthlyEmailToken : sub.annualEmailToken;

			const unsubscribe = await axios({
				method: 'post',
				url: `${this.paystackHost}/subscription/enable`,
				data: {
					code: code,
					token: token
				},
				headers: {
					Authorization: `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})

			if (unsubscribe.data.status !== true) {
				throw new BadRequestException('Reactivation unsuccessful');
			} else {
				sub.status = 'active';
				await this.db.update(sub.status);
				throw new BadRequestException('Unsubscription unsuccessful');
				return { status: 'success' };
			}
		} catch(err: any){
			console.log(err)
			throw new BadRequestException('Could not enable subscription')
		}
	}

	async getSubscription(userUid: string) {
		try {
			const [subscription] = await this.db.get(this.db.key(['Subscription', userUid]));
			if(!subscription){ throw new NotFoundException('Subscription not found') };
			if(subscription.status !== 'active'){ throw new NotFoundException('No active subscriptions') };

			return subscription;
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async updateSubscriptionLink(userUid: string) {
		try {
			const [sub] = await this.db.get(this.db.key(['Subscription', userUid]));
			if(!sub){ throw new NotFoundException()}
			const subCode = sub.cycle === 'monthly' ? sub.monthlyCode : sub.annualCode;
			const link = await axios({
				method: 'post',
				url: `${this.paystackHost}/subscription/${subCode}/manage/link`,
				headers: {
					'Authorization': `Bearer ${this.key}`,
				},
				responseType: 'json'
			})

			return link.data.data.link;
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async getCustomer(userUid: string){
		try {
			const userRecords = await this.authService.getUserInfo(userUid);
			const [user] = await this.db.get(this.db.key(['User', userUid]));			

			const record = await axios({
				method: 'get',
				url: `${this.paystackHost}/customer/${user.customerCode ? user.customerCode : encodeURIComponent(userRecords.email)}`,
				headers: {
					Authorization: `Bearer ${this.key}`,
					"Content-Type": 'application/json'
				},
				responseType: 'json'
			})

			return record.data.data
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	async createReceipt(transaction: any, isProduct: boolean, details: string, productId?: string){
		
		try {
			const userRecords = await this.authService.getAuth().getUserByEmail(transaction.customer.email)
			const [subscription] = await this.db.get(this.db.key(['Subscription', userRecords.uid]));
			const [user] = await this.db.get(this.db.key(['User', userRecords.uid]));

			let product: any;

			if(productId){
				[product] = await this.db.get(this.db.key(['Product', +productId]))
			}

			const readableMoney = parseFloat((+transaction.amount/100).toFixed(2)).toLocaleString('en-ZA', {style: 'currency', currency: 'ZAR'}).substring(2)

			const file = await fs.readFile(path.resolve(__dirname, '../../logo.png'))
			const doc = new PDFDocument({size: 'A4'})
			doc.pipe(createWriteStream('receipt.pdf'))
			doc.rect(80, 0, 435, 841).lineWidth(1).fillAndStroke('#F8F9FA','#FAF9FA')
			doc.image(file, 100, 30, {
				width: 60
			})
			doc.font('Helvetica-Bold', 18).fillColor('#073b4c').text('Screen List', 100, 90);
			doc.font('Courier', 28).fillColor('#073b4c').text('RECEIPT', 250, 120, {underline: true, width: 245, align: 'right', lineGap: 2});
			doc.font('Courier-Bold', 12).fillColor('#073B4C').text('CUSTOMER INFORMATION', 100, 163, {width: 395, align: 'left'})
			// doc.font('Courier', 12).fillColor('#073B4C').text('alex@makamuta.com', 100, 179, {width: 395, align: 'left'})
			if(user.firstName || user.lastName){
				doc.moveDown()
				doc.font('Courier', 10).fillColor('#073B4C').text('Full Name', 100)
				doc.moveUp()
				doc.text(`${user.firstName ? user.firstName : ''} ${user.lastName ? user.lastName : ''}`, 250)
			}
			

			doc.moveDown()
			doc.font('Courier', 10).fillColor('#073B4C').text('Email', 100)
			doc.moveUp()
			doc.text(userRecords.email, 250)

			doc.moveDown()
			doc.text('UID', 100)
			doc.moveUp()
			doc.text(userRecords.uid, 250)

			doc.moveDown()
			doc.text('Username', 100)
			doc.moveUp()
			doc.text(user.userName, 250)

			doc.moveDown(3)
			doc.font('Courier-Bold', 12).fillColor('#073B4C').text('PAYMENT INFORMATION', 100) 

			doc.moveDown()
			doc.font('Courier', 10).fillColor('#073B4C').text('Transaction Reference')
			doc.moveUp()
			doc.fontSize(10).text(`${transaction.reference}`, 250)

			doc.moveDown()
			doc.fontSize(10).text('Transaction Amount', 100)
			doc.moveUp()
			doc.text(readableMoney, 250)

			doc.moveDown()
			doc.text('Currency', 100)
			doc.moveUp()
			doc.text(`${transaction.currency}`, 250)

			doc.moveDown()
			doc.text('Transaction Status', 100)
			doc.moveUp()
			doc.text(`${transaction.status}`, 250)

			doc.moveDown()
			doc.text('Transaction Date', 100)
			doc.moveUp()
			doc.text(
				`${new Intl.DateTimeFormat('en-ZA', {
					dateStyle: 'full', 
					timeStyle: 'long', 
					timeZone: 'Africa/Johannesburg' 
				}).format(new Date(transaction.paidAt))}`,
				250
			)

			doc.moveDown()
			doc.text('Payment Type', 100)
			doc.moveUp()
			doc.text(`${transaction.channel}`, 250)

			if(transaction.channel === 'card'){
				doc.moveDown()
				doc.text('Card Number', 100)
				doc.moveUp()
				doc.text(`${transaction.authorization.bin}****${transaction.authorization.last4}`, 250)
			}
			

			doc.moveDown()
			doc.text('Item Details', 100)
			doc.moveUp()
			doc.text(details, 250)

			doc.moveDown(3)
			doc.font('Courier-Bold', 12).fillColor('#073B4C').text(`${isProduct ? "PRODUCT" : "SERVICE"} INFORMATION`, 100)

			if(isProduct === true){
				if(product.type === 'article'){
					doc.moveDown()
					doc.font('Courier', 10).text('Product ID', 100)
					doc.moveUp()
					doc.text(product.articleId, 250)
				}
				

				doc.moveDown()
				doc.font('Courier', 10).text('Product Type', 100)
				doc.moveUp()
				doc.text(product.type, 250)

				doc.moveDown()
				doc.text('Product Name', 100)
				doc.moveUp()
				doc.text(product.title, 250)

			} else {
				doc.moveDown()
				doc.font('Courier', 10).text('Service Type', 100)
				doc.moveUp()
				doc.text('Subscription', 250)

				doc.moveDown()
				doc.text('Service Name', 100)
				doc.moveUp()
				doc.text(`${subscription.cycle === 'monthly' ? 'Marginal Monthly Plan' : 'Marginal Annual Plan'}`, 250)

				doc.moveDown()
				doc.text('Subscription Term', 100)
				doc.moveUp()
				doc.text(subscription.cycle, 250)
			}
			


			const bufferArray: Buffer[] = []
			doc.on('data', (chunk) => { 
				bufferArray.push(chunk)	
			})
			doc.end()
			// console.log(doc)

			const buffer = new Promise<Buffer>((resolve, reject) => {
				doc.on('end', () => {
					resolve(Buffer.concat(bufferArray))
				})
			})

			console.log(await buffer)

			// await fs.writeFile(path.resolve(__dirname, './recept.pdf'), doc)
			
			return "<h1>Heyy</h1?"
		} catch(err: any){
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	// TODO: Create a promo code creation, update and deletion methods
	// TODO: Create a user transactions fetcher method
	// TODO: Create plan type products redemption method & fetcher method for the receiver.
}
