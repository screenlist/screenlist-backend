import { Controller, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';

@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {}
