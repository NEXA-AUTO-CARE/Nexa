import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../data-source';
import { User, Role, Vehicle, Booking, ServiceAddon, CorporateFleetEnquiry, SystemSetting } from '../entities';
import { VehicleType, BookingStatus, ServiceType } from '@nexa/shared';

async function seed() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();
  console.log('Database connection initialized successfully.');

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const bookingRepo = AppDataSource.getRepository(Booking);
  const addonRepo = AppDataSource.getRepository(ServiceAddon);
  const corporateRepo = AppDataSource.getRepository(CorporateFleetEnquiry);
  const settingRepo = AppDataSource.getRepository(SystemSetting);

  console.log('Clearing existing dynamic data for a fresh seed...');
  // Delete dynamic records to avoid duplicates and conflicts, keeping roles intact
  await bookingRepo.createQueryBuilder().delete().execute();
  await vehicleRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();
  await addonRepo.createQueryBuilder().delete().execute();
  await corporateRepo.createQueryBuilder().delete().execute();
  await settingRepo.createQueryBuilder().delete().execute();

  console.log('Fetching system roles...');
  const customerRole = await roleRepo.findOne({ where: { name: 'customer' } });
  const vendorRole = await roleRepo.findOne({ where: { name: 'vendor' } });
  const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
  const superAdminRole = await roleRepo.findOne({ where: { name: 'super_admin' } });

  if (!customerRole || !vendorRole || !adminRole || !superAdminRole) {
    throw new Error('System roles (customer, vendor, admin, super_admin) must exist in the database. Run migrations first.');
  }

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superAdmin = userRepo.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@nexaautocare.com',
    phoneNumber: '+447700900000',
    displayName: 'Super Admin',
    otpVerified: true,
    passwordHash,
    roleId: superAdminRole.roleId,
    role: superAdminRole,
  });
  await userRepo.save(superAdmin);

  const admin = userRepo.create({
    firstName: 'Nexa',
    lastName: 'Admin',
    email: 'admin@nexaautocare.com',
    phoneNumber: '+447700900001',
    displayName: 'Nexa Admin',
    otpVerified: true,
    passwordHash,
    roleId: adminRole.roleId,
    role: adminRole,
  });
  await userRepo.save(admin);

  const vendor = userRepo.create({
    firstName: 'Aberdeen',
    lastName: 'Detailer',
    email: 'vendor@nexaautocare.com',
    phoneNumber: '+447700900002',
    displayName: 'Aberdeen Detailer Pro',
    otpVerified: true,
    passwordHash,
    roleId: vendorRole.roleId,
    role: vendorRole,
    stripeAccountId: 'acct_1032D82e319d',
  });
  await userRepo.save(vendor);

  const customer = userRepo.create({
    firstName: 'John',
    lastName: 'Doe',
    email: 'customer@nexa.test',
    phoneNumber: '+447700900003',
    displayName: 'John Doe',
    otpVerified: true,
    passwordHash,
    roleId: customerRole.roleId,
    role: customerRole,
  });
  await userRepo.save(customer);

  console.log('Seeding vehicles...');
  const vehicle1 = vehicleRepo.create({
    ownerId: customer.userId,
    owner: customer,
    registrationNumber: 'AB12CDE',
    make: 'Mini',
    model: 'Cooper',
    vehicleType: VehicleType.STANDARD,
    colour: 'Red',
  });
  const vehicle2 = vehicleRepo.create({
    ownerId: customer.userId,
    owner: customer,
    registrationNumber: 'XY67ZQP',
    make: 'Ford',
    model: 'Kuga',
    vehicleType: VehicleType.GRANDE,
    colour: 'Black',
  });
  const vehicle3 = vehicleRepo.create({
    ownerId: customer.userId,
    owner: customer,
    registrationNumber: 'SD70DEF',
    make: 'Land Rover',
    model: 'Defender',
    vehicleType: VehicleType.MAXI,
    colour: 'Silver',
  });
  await vehicleRepo.save([vehicle1, vehicle2, vehicle3]);

  console.log('Seeding Service Add-ons...');
  const addons = await addonRepo.save([
    addonRepo.create({ name: 'Seat Shampoo', description: 'Deep extract steam shampoo for all car seats', price: '5.00', isActive: true }),
    addonRepo.create({ name: 'Floor Shampoo', description: 'Deep carpet shampoo and stain treatment', price: '5.00', isActive: true }),
    addonRepo.create({ name: 'Tyre dress', description: 'Long-lasting high-gloss tyre shine treatment', price: '2.50', isActive: true }),
    addonRepo.create({ name: 'Pet hair removal', description: 'Complete intensive vacuum pet fur extraction', price: '15.00', isActive: true }),
    addonRepo.create({ name: 'Polish', description: 'High-quality gloss paint polish coating', price: '20.00', isActive: true }),
    addonRepo.create({ name: 'Tar removal', description: 'Safe organic solvent removal of road tar and sap spots', price: '25.00', isActive: true }),
  ]);

  console.log('Seeding System Settings...');
  const categoryPricingSetting = settingRepo.create({
    key: 'car_category_pricing',
    value: JSON.stringify({
      [VehicleType.STANDARD]: '25.00',
      [VehicleType.GRANDE]: '30.00',
      [VehicleType.MAXI]: '35.00',
      [VehicleType.TRANSIT]: '40.00',
    }),
  });

  const termsSetting = settingRepo.create({
    key: 'terms_and_conditions',
    value: `## Nexa Booking Terms & Conditions
Last updated: May 2026

Welcome to NEXA. Before booking or initiating checkout, please review and accept these terms:

1. **Vehicle Classifications**: The booking rate is bound to your selected vehicle type (Standard, Grande, Maxi, or Transit). If a vehicle is found to belong to a higher tier than booked, additional payments will be requested at the correct rate.
2. **Safe Workspace Obligation**: You must supply a suitable, safe and off-road driveway, driveway bay, or off-road space for our service. If the space is deemed unsafe or unsuitable, the wash may be cancelled with a 70% refund.
3. **Cancellation Policy**: Cancellations must be made at least 24 hours prior. Cancellations within 24 hours will be subject to a 30% retention fee, resulting in a 70% refund.
4. **Aberdeen Service Region**: Currently serving domestic addresses in the Aberdeen and suburban area.`,
  });

  const faqsSetting = settingRepo.create({
    key: 'faqs',
    value: JSON.stringify([
      // ── Default FAQs (prepended — always appear first) ──
      {
        question: 'How does NEXA work?',
        answer: 'Simply register your vehicle, pick a date and time, and one of our professional detailers will come to your location. No need to travel to a car wash — we bring the service to you.',
      },
      {
        question: 'What areas do you cover?',
        answer: 'We currently serve Aberdeen, Scotland and the surrounding area. We\'re expanding soon — sign up to be notified when we reach your location.',
      },
      {
        question: 'How long does a Mini Valet & Spray Polish take?',
        answer: 'A standard session takes approximately 45–60 minutes depending on the vehicle size and condition.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major debit and credit cards through our secure Stripe-powered checkout. Corporate fleet customers are invoiced separately.',
      },
      {
        question: 'Can I book for multiple vehicles?',
        answer: 'Yes! You can add multiple vehicles to your Garage and book services for each one individually. For businesses with fleets, we offer a dedicated Corporate Fleet option with custom pricing.',
      },
      {
        question: 'What if I need to cancel or reschedule?',
        answer: 'You can cancel or reschedule your booking up to 24 hours before the appointment at no charge through the app.',
      },
      // ── Additional FAQs (appended after defaults) ──
      {
        question: 'What is Nexa’s vehicle classification?',
        answer: 'Nexa operates four simple, transparent vehicle tiers to determine pricing:\n\n• <strong>Standard</strong> – Hatchbacks, Saloons, Coupes, City Cars (e.g. Ford Focus, BMW 3 Series, VW Golf)\n• <strong>Grande</strong> – Estates, MPVs, Crossovers, Mid-size SUVs (e.g. Ford Kuga, VW Tiguan, Volvo V60)\n• <strong>Maxi</strong> – Large SUVs, Full-size 4x4s, Minivans (e.g. Land Rover Defender, BMW X7, Ford Galaxy)\n• <strong>Transit</strong> – Mid commercial vans and equivalent (e.g. Ford Transit Custom, VW Transporter, Mercedes Vito).\n\nCheck out our clickable classification guide for details.',
      },
      {
        question: 'What space do I need to provide for the service?',
        answer: 'You must provide a safe and suitable off-road space (e.g. a driveway or private parking bay) for our detailers to carry out the service. If the space is deemed unsafe or unsuitable on arrival, the booking will be cancelled and a 70% refund issued.',
      },
      {
        question: 'What is the booking cancellation policy?',
        answer: 'Bookings cancelled at least 24 hours before the appointment are eligible for a full refund. Cancellations made within 24 hours are subject to a booking fee retention, with a 70% refund issued back to your payment method.',
      },
      {
        question: 'Is there a booking fee?',
        answer: 'Yes, a small <strong>£1.49 Booking & Protection Fee</strong> is applied to all bookings during checkout to secure and cover the detailing professional matching and service guarantees.',
      },
    ]),
  });

  const categoryLabelsSetting = settingRepo.create({
    key: 'vehicle_category_labels',
    value: JSON.stringify({
      STANDARD: 'Standard',
      GRANDE: 'Grande',
      MAXI: 'Maxi',
      TRANSIT: 'Transit',
    }),
  });

  const categoryDescriptionsSetting = settingRepo.create({
    key: 'vehicle_category_descriptions',
    value: JSON.stringify({
      STANDARD: 'Hatchbacks, Saloons, Coupes, City Cars',
      GRANDE: 'Estate cars, MPVs, Crossovers, Mid-size SUVs (e.g. Ford Kuga, VW Tiguan, Toyota RAV4, Volvo V60 Estate)',
      MAXI: 'Large SUVs, Full-size 4x4s, Minivans (e.g. Land Rover Defender, BMW X7, Ford Galaxy, Mercedes V-Class)',
      TRANSIT: 'mid commercial vans and equivalent-sized vehicles (e.g., Ford Transit Custom, VW Transporter, Vauxhall Vivaro, Renault Trafic, Mercedes Vito)',
    }),
  });

  const bookingFeeSetting = settingRepo.create({
    key: 'booking_fee',
    value: '1.49',
  });

  await settingRepo.save([
    categoryPricingSetting,
    termsSetting,
    faqsSetting,
    categoryLabelsSetting,
    categoryDescriptionsSetting,
    bookingFeeSetting,
  ]);

  console.log('Seeding bookings...');
  const basePriceStandard = 25.00 + 1.49; // standard + booking fee
  const basePriceGrande = 30.00 + 5.00 + 1.49; // grande + seat shampoo + booking fee
  const basePriceMaxi = 35.00 + 1.49; // maxi + booking fee

  const booking1 = bookingRepo.create({
    userId: customer.userId,
    customer,
    vehicleId: vehicle1.vehicleId,
    vehicle: vehicle1,
    vendorId: vendor.userId,
    vendor,
    serviceType: ServiceType.BASIC,
    bookingTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    serviceAddress: '12 Union St, Aberdeen AB11 5BT',
    price: basePriceStandard.toFixed(2),
    status: BookingStatus.COMPLETED,
    agreedDetailsCorrect: true,
    agreedSafeSpace: true,
    addons: [],
  });

  const booking2 = bookingRepo.create({
    userId: customer.userId,
    customer,
    vehicleId: vehicle2.vehicleId,
    vehicle: vehicle2,
    vendorId: vendor.userId,
    vendor,
    serviceType: ServiceType.BASIC,
    bookingTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    serviceAddress: '45 Queens Rd, Aberdeen AB15 4ZN',
    price: basePriceGrande.toFixed(2),
    status: BookingStatus.BOOKED,
    agreedDetailsCorrect: true,
    agreedSafeSpace: true,
    addons: [
      { addonId: addons[0].addonId, name: addons[0].name, price: addons[0].price },
    ],
  });

  const booking3 = bookingRepo.create({
    userId: customer.userId,
    customer,
    vehicleId: vehicle3.vehicleId,
    vehicle: vehicle3,
    vendorId: null,
    serviceType: ServiceType.BASIC,
    bookingTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days (unassigned)
    serviceAddress: '78 Holburn St, Aberdeen AB10 6BY',
    price: basePriceMaxi.toFixed(2),
    status: BookingStatus.BOOKED,
    agreedDetailsCorrect: true,
    agreedSafeSpace: true,
    addons: [],
  });

  await bookingRepo.save([booking1, booking2, booking3]);

  console.log('Seeding Corporate Fleet Enquiries...');
  await corporateRepo.save([
    corporateRepo.create({
      companyName: 'Grampian Energy Corp',
      fleetSize: 18,
      contactPerson: 'David Ross',
      businessEmail: 'dross@grampianenergy.com',
      businessPhone: '+441224555888',
      status: 'new',
    }),
    corporateRepo.create({
      companyName: 'Aberdeen Offshore Logistics',
      fleetSize: 45,
      contactPerson: 'Sarah Jenkins',
      businessEmail: 's.jenkins@abdn-offshore.co.uk',
      businessPhone: '+441224555999',
      status: 'new',
    }),
    corporateRepo.create({
      companyName: 'North Sea Wind Ltd',
      fleetSize: 8,
      contactPerson: 'Fiona Macleod',
      businessEmail: 'fiona.m@northseawind.com',
      businessPhone: '+441224555111',
      status: 'invoiced',
    }),
  ]);

  console.log('Database seeded successfully!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error during database seeding:', err);
  process.exit(1);
});
