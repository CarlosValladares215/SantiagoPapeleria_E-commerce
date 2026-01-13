
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingConfig, ShippingConfigSchema } from './schemas/shipping-config.schema';
import { ShippingZone, ShippingZoneSchema } from './schemas/shipping-zone.schema';
import { ShippingRate, ShippingRateSchema } from './schemas/shipping-rate.schema';
import { ShippingCity, ShippingCitySchema } from './schemas/shipping-city.schema';
import { UsuariosModule } from '../users/usuarios.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ShippingConfig.name, schema: ShippingConfigSchema },
            { name: ShippingZone.name, schema: ShippingZoneSchema },
            { name: ShippingRate.name, schema: ShippingRateSchema },
            { name: ShippingCity.name, schema: ShippingCitySchema },
        ]),
        UsuariosModule,
        NotificationsModule,
    ],
    controllers: [ShippingController],
    providers: [ShippingService],
    exports: [ShippingService],
})
export class ShippingModule { }
