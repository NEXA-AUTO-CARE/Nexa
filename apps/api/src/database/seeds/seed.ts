import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../data-source';
import { User, Role, ServiceAddon, SystemSetting } from '../entities';

async function seed() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();
  console.log('Database connection initialized successfully.');

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);
  const addonRepo = AppDataSource.getRepository(ServiceAddon);
  const settingRepo = AppDataSource.getRepository(SystemSetting);

  console.log('Clearing existing dynamic data for a fresh seed...');
  // TRUNCATE with CASCADE handles all FK dependencies in one shot regardless of order
  await AppDataSource.query(`
    TRUNCATE TABLE
      "refresh_tokens",
      "otp_codes",
      "reviews",
      "job_photos",
      "payments",
      "bookings",
      "vehicles",
      "users",
      "service_addons",
      "system_settings",
      "corporate_fleet_enquiries"
    CASCADE
  `);

  console.log('Fetching system roles...');
  const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
  const superAdminRole = await roleRepo.findOne({
    where: { name: 'super_admin' },
  });

  if (!adminRole || !superAdminRole) {
    throw new Error(
      'System roles (admin, super_admin) must exist in the database. Run migrations first.',
    );
  }

  console.log('Seeding admin users...');
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

  console.log('Seeding Service Add-ons...');
  await addonRepo.save([
    addonRepo.create({
      name: 'Seat Shampoo',
      description: 'Deep extract steam shampoo for all car seats',
      price: '24.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Floor Shampoo',
      description: 'Deep carpet shampoo and stain treatment',
      price: '9.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Tyre dress',
      description: 'Long-lasting high-gloss tyre shine treatment',
      price: '8.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Pet hair removal',
      description: 'Complete intensive vacuum pet fur extraction',
      price: '19.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Polish',
      description: 'High-quality gloss paint polish coating',
      price: '29.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Tar removal',
      description: 'Safe organic solvent removal of road tar and sap spots',
      price: '14.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Deep Interior Clean',
      description: 'Comprehensive deep cleaning of all interior surfaces',
      price: '39.99',
      isActive: true,
    }),
    addonRepo.create({
      name: 'Polish',
      description: 'High-quality gloss paint polish coating',
      price: '29.99',
      isActive: true,
    })
  ]);

  console.log('Seeding System Settings...');
  await settingRepo.save([
    settingRepo.create({
      key: 'car_category_pricing',
      value: JSON.stringify({
        small_car: '40.00',
        family_car: '50.00',
        large_suv_van: '60.00',
      }),
    }),
    settingRepo.create({
      key: 'terms_and_conditions',
      value: `Before you confirm your booking, please confirm:\n\n- I confirm that the vehicle details I have provided are accurate. I understand that if my vehicle does not match the tier I have selected, I may be asked to pay an additional amount in line with the correct NEXA rate. See [NEXA Vehicle Classification Guide](/docs/nexa-vehicle-classification-guide.pdf).\n- I confirm that I have a suitable and safe space available for the service to be carried out at the address provided. I understand that if the space is deemed unsuitable on arrival, my booking may be cancelled and a 70% refund will be issued.\n- I confirm that I am the registered owner of the vehicle or have the permission of the registered owner to book this service.\n- I agree to the [Nexa Terms of Service](/docs/nexa-terms-of-service.pdf) and [Privacy Policy](/docs/nexa-privacy-policy.pdf).\n- I confirm that I have read the Cancellation Policy: full refund 24h prior, 70% refund if cancelled within 24h of booking slot.`,
    }),
    settingRepo.create({
      key: 'faqs',
      value: JSON.stringify([
        {
          question: 'How does NEXA work?',
          answer:
            'Simply register your vehicle, pick a date and time, and one of our professional detailers will come to your location. No need to travel to a car wash — we bring the service to you.',
        },
        {
          question: 'What areas do you cover?',
          answer:
            "We currently serve Aberdeen, Scotland and the surrounding area. We're expanding soon — sign up to be notified when we reach your location.",
        },
        {
          question: 'How long does a Mini Valet & Spray Polish take?',
          answer:
            'A standard session takes approximately 45–60 minutes depending on the vehicle size and condition.',
        },
        {
          question: 'What payment methods do you accept?',
          answer:
            'We accept all major debit and credit cards through our secure Stripe-powered checkout. Corporate fleet customers are invoiced separately.',
        },
        {
          question: 'Can I book for multiple vehicles?',
          answer:
            'Yes! You can add multiple vehicles to your Garage and book services for each one individually. For businesses with fleets, we offer a dedicated Corporate Fleet option with custom pricing.',
        },
        {
          question: 'What if I need to cancel or reschedule?',
          answer:
            'You can cancel or reschedule your booking up to 24 hours before the appointment at no charge through the app.',
        },
        {
          question: "What is Nexa's vehicle classification?",
          answer:
            'Nexa operates three simple, transparent vehicle tiers:\n\n• <strong>Small Car</strong> – Subcompact hatchbacks, City cars\n• <strong>Family Car</strong> – Mid-size sedans, Crossover SUVs\n• <strong>Large SUV / Van</strong> – Full-size SUVs, 7-seaters, Multi-purpose vans.',
        },
        {
          question: 'What space do I need to provide for the service?',
          answer:
            'You must provide a safe and suitable off-road space (e.g. a driveway or private parking bay). If the space is deemed unsafe on arrival, the booking will be cancelled and a 70% refund issued.',
        },
        {
          question: 'What is the booking cancellation policy?',
          answer:
            'Bookings cancelled at least 24 hours before the appointment are eligible for a full refund. Cancellations within 24 hours receive a 70% refund.',
        },
        {
          question: 'Is there a booking fee?',
          answer:
            'Yes, a small <strong>£1.49 Booking & Protection Fee</strong> is applied to all bookings during checkout.',
        },
      ]),
    }),
    settingRepo.create({
      key: 'vehicle_category_labels',
      value: JSON.stringify({
        small_car: 'Small Car',
        family_car: 'Family Car',
        large_suv_van: 'Large SUV / 7-Seater / Van',
      }),
    }),
    settingRepo.create({
      key: 'vehicle_category_descriptions',
      value: JSON.stringify({
        small_car: 'Subcompact hatchbacks, City cars, Small-segment hatchbacks (e.g., Fiat 500, Toyota Aygo, Toyota Yaris, Mini, VW Polo, VW Golf, Vauxhall Corsa)',
        family_car: 'Mid-size sedans, Compact family hatchbacks, Crossover SUVs (e.g., Ford Focus, Audi A3, Tesla Model 3 / Model Y, Vauxhall Mokka, Mercedes-Benz C-Class / E-Class, Hyundai Tucson, Nissan Qashqai, Kia Sportage, BMW X3, Range Rover Evoque)',
        large_suv_van: 'Full-size luxury SUVs, 7-seater passenger vehicles, Multi-purpose vans (e.g., Land Rover Discovery, Range Rover Velar, Audi Q7, BMW X5, Kia Sorento, VW Transporter)',
      }),
    }),
    settingRepo.create({ key: 'booking_fee', value: '1.49' }),
    settingRepo.create({
      key: 'booking_time_slots',
      value: JSON.stringify([
        { key: 'early_morning', label: 'Early Morning (7:00 AM)', hour: 7 },
        { key: 'morning', label: 'Morning (9:00 AM)', hour: 9 },
        { key: 'late_morning', label: 'Late Morning (11:00 AM)', hour: 11 },
        { key: 'afternoon', label: 'Afternoon (1:00 PM)', hour: 13 },
        { key: 'evening', label: 'Evening (4:00 PM)', hour: 16 },
        { key: 'late_evening', label: 'Late Evening (6:00 PM)', hour: 18 },
      ]),
    }),
    settingRepo.create({
      key: 'service_labels',
      value: JSON.stringify({ base: 'Mini Valet' }),
    }),
    settingRepo.create({
      key: 'customer_type',
      value: '["Individual","Corporate"]',
    }),
    settingRepo.create({
      key: 'vehicle_categories',
      value: JSON.stringify({
        small_car: {
          display_name: 'Small Car',
          vehicle_types: [
            'Subcompact hatchbacks',
            'City cars',
            'Small-segment hatchbacks',
          ],
          metrics: {
            seating_capacity: '4 to 5 seats',
          },
          examples: [
            'Fiat 500',
            'Toyota Aygo',
            'Toyota Yaris',
            'Mini',
            'VW Polo',
            'VW Golf',
            'Vauxhall Corsa',
          ],
        },
        family_car: {
          display_name: 'Family Car',
          vehicle_types: [
            'Mid-size sedans',
            'Compact family hatchbacks',
            'Crossover SUVs',
          ],
          metrics: {
            seating_capacity: '5 seats',
          },
          examples: [
            'Ford Focus',
            'Audi A3',
            'Tesla Model 3 / Model Y',
            'Vauxhall Mokka',
            'Mercedes-Benz C-Class / E-Class',
            'Hyundai Tucson',
            'Nissan Qashqai',
            'Kia Sportage',
            'BMW X3',
            'Range Rover Evoque',
          ],
        },
        large_suv_van: {
          display_name: 'Large SUV / 7-Seater / Van',
          vehicle_types: [
            'Full-size luxury SUVs',
            '7-seater passenger vehicles',
            'Multi-purpose vans',
          ],
          metrics: {
            seating_capacity: '7+ seats / Van',
          },
          examples: [
            'Land Rover Discovery',
            'Range Rover Velar',
            'Audi Q7',
            'BMW X5',
            'Kia Sorento',
            'VW Transporter',
          ],
        },
      }),
    }),
    settingRepo.create({
      key: 'notification_templates',
      value: JSON.stringify({
        booked: {
          title: 'Booking Confirmed',
          emailBody:
            "Your booking (Ref: {{bookingRef}} / TXN: {{transactionRef}}) for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We'll notify you when a detailer accepts.",
          smsBody:
            "NEXA: Your booking (Ref: {{bookingRef}}) for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We'll notify you when a detailer accepts.",
        },
        accepted: {
          title: 'Booking Accepted',
          emailBody:
            "Great news! A detailer has accepted your booking (Ref: {{bookingRef}} / TXN: {{transactionRef}}) for {{vehicleSummary}}. They'll arrive on {{bookingTime}}.",
          smsBody:
            "NEXA: Great news! A detailer has accepted your booking (Ref: {{bookingRef}}) for {{vehicleSummary}}. They'll arrive on {{bookingTime}}.",
        },
        in_progress: {
          title: 'Detailing In Progress',
          emailBody:
            'Your detailer is now working on {{vehicleSummary}} (Ref: {{bookingRef}} / TXN: {{transactionRef}}). Sit back and relax!',
          smsBody:
            'NEXA: Your detailer is now working on {{vehicleSummary}} (Ref: {{bookingRef}}). Sit back and relax!',
        },
        completed: {
          title: 'Wash Complete',
          emailBody:
            "Your {{vehicleSummary}} (Ref: {{bookingRef}} / TXN: {{transactionRef}}) is looking fresh! Your wash is complete. We'd love to hear your feedback.",
          smsBody:
            "NEXA: Your {{vehicleSummary}} (Ref: {{bookingRef}}) is looking fresh! Your wash is complete. We'd love to hear your feedback.",
        },
        cancelled: {
          title: 'Booking Cancelled',
          emailBody:
            'Your booking (Ref: {{bookingRef}} / TXN: {{transactionRef}}) for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
          smsBody:
            'NEXA: Your booking (Ref: {{bookingRef}}) for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
        },
      }),
    }),
  ]);

  console.log('Database seeded successfully!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error during database seeding:', err);
  process.exit(1);
});
