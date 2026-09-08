-- Creates the Tenant row this app authenticates against. Run it against the
-- production database before the first build; until it exists, every request
-- from this app answers 404 TENANT_NOT_FOUND.
INSERT INTO public."Tenant" (id, slug, name, plan, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'mido-barber', 'Mido Barber', 'BASIC', true, NOW(), NOW());

-- And the shop's first dashboard login. Replace the bcrypt hash: generate one
-- with  node -e "console.log(require('bcryptjs').hashSync('THE_PASSWORD', 10))"
-- INSERT INTO public."AdminUser" (id, "tenantId", email, "passwordHash", name, "createdAt", "updatedAt")
-- SELECT gen_random_uuid()::text, id, 'owner@example.com', '<bcrypt-hash>', 'Mido Barber', NOW(), NOW()
-- FROM public."Tenant" WHERE slug = 'mido-barber';
