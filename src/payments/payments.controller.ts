import { 
	Controller, 
	Get,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	Headers,
	UseGuards,
	ValidationPipe,
	Res
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service'
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { ChargeForProduct } from './payments.dto';

@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentsController {
	constructor(private paymentsService: PaymentsService, private authService: AuthService,){}

	@Get('pay')
	async pay(@Query('email') encodedEmail: string, @Query('amount') amount: number, @Res() res: Response){
		const email = decodeURIComponent(encodedEmail);
		const data = await this.paymentsService.payAnyAmount(amount, email);
		res.redirect(data['authorization_url']);
	}

	@Get('verify')
	async verifyPay(@Query('ref') ref: string, @Query('redirect') redirect: string, @Res() res: Response){
		const data = await this.paymentsService.verifyTransaction(ref, redirect);
		if(data.path){
			res.redirect(data.path)
		} else {
			return data
		}
	}

	@Get('buy')
	@Roles('member')
	async buyArticle(
		@Headers('AuthorizationToken') idToken: string,
		@Query('id') articleId: string,
		@Query('init') firstCharge: boolean,
		@Query('redirect') redirect: string,
		@Query('type') type: 'article' | 'plan' | 'prorate',
		@Query('email') receiverEmail: string,
		@Query('days') proratedDays: number,
		@Res() res: Response
	){
		const userUid = await this.authService.getUserUid(idToken);
		const data: ChargeForProduct = {
			articleId: articleId,
			userUid: userUid,
			type: type,
			redirect: redirect,
			firstCharge: firstCharge,
			receiverEmail: receiverEmail,
			proratedDays: proratedDays
		} 
		const {path} = await this.paymentsService.chargeForProduct(data);
		res.redirect(path);
	}

	@Get('subscription')
	@Roles('member')
	async getSubscription(@Headers('AuthorizationToken') idToken: string){
		const userUid = await this.authService.getUserUid(idToken);
		return await this.paymentsService.getSubscription(userUid);
	}

	@Get('subscription/monthly/initialise')
	@Roles('member')
	async subscribeMonthlyInit(
		@Headers('AuthorizationToken') idToken: string,
		@Query('code') code: string,
		@Res() res: Response
	){
		const userUid = await this.authService.getUserUid(idToken);
		
		const data = await this.paymentsService.authPayment(userUid, 'monthly', code);
		res.redirect(data['authorization_url'])
	}

	@Get('subscription/annual/initialise')
	@Roles('member')
	async subscribeAnnualInit(
		@Headers('AuthorizationToken') idToken: string,
		@Query('code') code: string
	){
		const userUid = await this.authService.getUserUid(idToken);
		
		return await this.paymentsService.authPayment(userUid, 'annual', code);
	}

	@Get('subscription/update')
	@Roles('member')
	async getSubscriptionUpdateLink(@Headers('AuthorizationToken') idToken: string, @Res() res: Response){
		const userUid = await this.authService.getUserUid(idToken);
		const data = await this.paymentsService.updateSubscriptionLink(userUid);
		res.redirect(data)
	}

	@Get('subscription/create')
	@Roles('member')
	async subscribe(
		@Query('ref') ref: string,
		@Query('code') code: string,
		@Query('cycle') cycle: string
	){
		const monthly = cycle === 'monthly' ? true : false;
		const reference = ref ? ref : ''
		
		return await this.paymentsService.subscribeMembership( monthly, ref, code);
	}

	@Post('subscription/disable')
	@Roles('member')
	async unsubscribe(@Headers('AuthorizationToken') idToken: string){
		const userUid = await this.authService.getUserUid(idToken);
		return await this.paymentsService.disableMembership(userUid);
	}

	@Post('subscription/enable')
	@Roles('member')
	async reactivate(@Headers('AuthorizationToken') idToken: string){
		const userUid = await this.authService.getUserUid(idToken);
		return await this.paymentsService.enableMembership(userUid);
	}

	@Get('customer')
	@Roles('member')
	async getCustomer(@Headers('AuthorizationToken') idToken: string){
		const userUid = await this.authService.getUserUid(idToken);
		return await this.paymentsService.getCustomer(userUid);
	}

	@Get('receipt')
	async getReceipt(){
		const data = {
			"id": 3233122842,
			"domain": "test",
			"status": "success",
			"reference": "LBrhUXKkrscc4QAwS2M4sFYCAem21698510224635",
			"amount": 200,
			"message": null,
			"gateway_response": "Successful",
			"paid_at": "2023-10-28T16:39:37.000Z",
			"created_at": "2023-10-28T16:23:47.000Z",
			"channel": "card",
			"currency": "ZAR",
			"ip_address": "41.150.219.143",
			"metadata": null,
			"log": {
				"start_time": 1698511150,
				"time_spent": 28,
				"attempts": 2,
				"errors": 1,
				"success": true,
				"mobile": false,
				"input": [],
				"history": [
					{
						"type": "action",
						"message": "Attempted to pay with card",
						"time": 18
					},
					{
						"type": "error",
						"message": "Error: Declined",
						"time": 19
					},
					{
						"type": "action",
						"message": "Attempted to pay with card",
						"time": 27
					},
					{
						"type": "success",
						"message": "Successfully paid with card",
						"time": 28
					}
				]
			},
			"fees": 7,
			"fees_split": null,
			"customer": {
				"id": 142810878,
				"first_name": null,
				"last_name": null,
				"email": "alexkokobane@gmail.com",
				"phone": null,
				"metadata": null,
				"customer_code": "CUS_odpc9owbbw3oeu1",
				"risk_action": "default"
			},
			"authorization": {
				"authorization_code": "AUTH_uh4xlzdfwn",
				"bin": "408408",
				"last4": "4081",
				"exp_month": "12",
				"exp_year": "2030",
				"channel": "card",
				"card_type": "visa ",
				"bank": "TEST BANK",
				"country_code": "ZA",
				"brand": "visa",
				"reusable": true,
				"signature": "SIG_d8dzmdPMUPo6MIjuIV7o",
				"account_name": null
			},
			"plan": {},
			"split": {},
			"subaccount": {},
			"order_id": null,
			"paidAt": "2023-10-28T16:39:37.000Z",
			"createdAt": "2023-10-28T16:23:47.000Z",
			"requested_amount": 200,
			"source": {
				"source": "merchant_api",
				"type": "api",
				"identifier": null,
				"entry_point": "transaction_initialize"
			},
			"pos_transaction_data": null
		}
		return await this.paymentsService.createReceipt(data, false, 'Marginal Monthly Plan')
	}
}
