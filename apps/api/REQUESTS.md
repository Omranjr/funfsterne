# API Request Examples

Base URL: `http://localhost:4000`

## Public routes

### List branches
```bash
curl -s http://localhost:4000/public/branches | jq
```

### List products
```bash
curl -s http://localhost:4000/public/products | jq
```

### Filter products by category
```bash
curl -s "http://localhost:4000/public/products?category=HAIR" | jq
```

### Filter products by branch availability
```bash
curl -s "http://localhost:4000/public/products?branchId=<branch-id>" | jq
```

### Get a single product
```bash
curl -s http://localhost:4000/public/products/<product-id> | jq
```

### Register a push token (no auth)
The mobile app registers its Expo push token the first time the user enables notifications. Tokens are upserted by `token` (so a re-registration updates `deviceId` and `platform` in place).

```bash
curl -s -X POST http://localhost:4000/public/push-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-curl-1",
    "token": "ExponentPushToken[curl-verify-001]",
    "platform": "IOS"
  }'
```

Example response:
```json
{
  "id": "cmrpr98gd0000juh7gxycgin6",
  "deviceId": "test-device-curl-1",
  "token": "ExponentPushToken[curl-verify-001]",
  "platform": "IOS",
  "createdAt": "2026-07-18T02:36:08.077Z"
}
```

### List active discount codes (no auth)
Returns all codes where `isActive = true` and (no `expiresAt` OR `expiresAt` in the future). Each code includes the optional `scopeBranch`.

```bash
curl -s http://localhost:4000/public/discount-codes/active
```

Example response:
```json
[
  {
    "id": "cmrpr4jes0001vdw6wbkpljv4",
    "code": "WELCOME10",
    "type": "PERCENTAGE",
    "value": "10",
    "expiresAt": null,
    "maxRedemptions": null,
    "currentRedemptions": 0,
    "isActive": true,
    "scopeBranchId": "seed-branch-1",
    "scopeBranch": {
      "id": "seed-branch-1",
      "name": "FünfSterne Mitte",
      "address": "Hauptstraße 1",
      "city": "Berlin",
      "postalCode": "10115",
      "phone": "+49 30 0000000",
      "isActive": true,
      "createdAt": "2026-07-18T02:32:28.724Z",
      "updatedAt": "2026-07-18T02:32:28.724Z"
    }
  }
]
```

### Redeem a discount code from a device (no auth)
Each device can redeem a given code at most once. The mobile app calls this when the user swipes a code card. `deviceId` is the persistent device identifier from the app; `branchId` is optional and records where the redemption happened.

```bash
curl -s -X POST http://localhost:4000/public/discount-codes/WELCOME10/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-curl-1",
    "branchId": "seed-branch-1"
  }'
```

Success response (`200`):
```json
{
  "success": true,
  "discount": {
    "id": "cmrpr4jes0001vdw6wbkpljv4",
    "code": "WELCOME10",
    "type": "PERCENTAGE",
    "value": "10",
    "expiresAt": null,
    "maxRedemptions": null,
    "currentRedemptions": 1,
    "isActive": true,
    "scopeBranchId": "seed-branch-1"
  },
  "redemption": {
    "id": "cmrpr9ft40002juh78mwzi6at",
    "deviceId": "test-device-curl-1",
    "branchId": "seed-branch-1",
    "discountCodeId": "cmrpr4jes0001vdw6wbkpljv4",
    "redeemedAt": "2026-07-18T02:36:17.575Z"
  }
}
```

Error responses (all `400` except `404`):

| `errorCode` | HTTP | When |
|---|---|---|
| `ALREADY_REDEEMED_BY_DEVICE` | 400 | The same `deviceId` already redeemed this code (DB unique index `(deviceId, discountCodeId)` enforces this). |
| `INACTIVE` | 400 | The code exists but `isActive = false`. |
| `EXPIRED` | 400 | `expiresAt` is in the past. |
| `MAX_REDEMPTIONS_REACHED` | 400 | `currentRedemptions >= maxRedemptions`. |
| `NOT_FOUND` | 404 | No row with the given `code`. |

Example — repeat redemption from the same device:
```bash
curl -s -X POST http://localhost:4000/public/discount-codes/WELCOME10/redeem \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-curl-1","branchId":"seed-branch-1"}'
```
```json
{ "errorCode": "ALREADY_REDEEMED_BY_DEVICE", "error": "Discount code already redeemed on this device" }
```

A different device can still redeem the same code — there is no global limit unless `maxRedemptions` is set on the code:
```bash
curl -s -X POST http://localhost:4000/public/discount-codes/WELCOME10/redeem \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-curl-2","branchId":"seed-branch-1"}'
```

## Admin auth

### Login
```bash
curl -s -X POST http://localhost:4000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@funfsterne.de","password":"password"}' | jq
```

Use the returned `token` as `Authorization: Bearer <token>` in admin requests.

## Admin routes (require Bearer admin token)

### Create branch
```bash
curl -s -X POST http://localhost:4000/admin/branches \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fünf Sterne Mitte",
    "address": "Musterstraße 1",
    "city": "Berlin",
    "postalCode": "10115",
    "phone": "+493012345678"
  }' | jq
```

### Update branch
```bash
curl -s -X PATCH http://localhost:4000/admin/branches/<branch-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+493098765432"}' | jq
```

### Delete branch
```bash
curl -s -X DELETE http://localhost:4000/admin/branches/<branch-id> \
  -H "Authorization: Bearer <admin-token>"
```

### Create product
```bash
curl -s -X POST http://localhost:4000/admin/products \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Haarwachs",
    "description": "Mattes Haarwachs für starken Halt",
    "category": "HAIR",
    "basePrice": 24.9,
    "images": []
  }' | jq
```

### Update product
```bash
curl -s -X PATCH http://localhost:4000/admin/products/<product-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"basePrice": 19.9}' | jq
```

### Delete product
```bash
curl -s -X DELETE http://localhost:4000/admin/products/<product-id> \
  -H "Authorization: Bearer <admin-token>"
```

### Set product availability per branch
```bash
curl -s -X PUT http://localhost:4000/admin/products/<product-id>/availability \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "<branch-id>",
    "inStock": true,
    "priceOverride": 22.9
  }' | jq
```

### Create discount code
```bash
curl -s -X POST http://localhost:4000/admin/discount-codes \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER20",
    "type": "PERCENTAGE",
    "value": 20,
    "maxRedemptions": 100
  }' | jq
```

### Create notification
```bash
curl -s -X POST http://localhost:4000/admin/notifications \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Neue Aktion",
    "body": "20% Rabatt auf alle Haarprodukte!",
    "discountCodeId": "<discount-code-id>"
  }' | jq
```

### Send push notification to all users
```bash
curl -s -X POST http://localhost:4000/admin/notifications/send \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Neue Aktion",
    "body": "20% Rabatt auf alle Haarprodukte!",
    "discountCodeId": "<discount-code-id>",
    "target": "all"
  }' | jq
```

## Image upload (admin only)

### Upload a product image
```bash
curl -s -X POST http://localhost:4000/admin/upload/image \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@/path/to/image.jpg" | jq
```

Attach the returned `url` to a product via `PATCH /admin/products/<product-id>`:
```bash
curl -s -X PATCH http://localhost:4000/admin/products/<product-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"images": ["https://...supabase.co/storage/v1/object/public/product-images/...jpg"]}' | jq
```

## User auth (magic-link)

### Request a magic link
```bash
curl -s -X POST http://localhost:4000/auth/magic-link/request \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}' | jq
```

### Verify magic link and register/login
```bash
curl -s -X POST http://localhost:4000/auth/magic-link/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<magic-link-token>",
    "pushToken": { "token": "<expo-push-token>", "platform": "IOS" }
  }' | jq
```

## Consumer routes (require Bearer consumer token)

The consumer token is a `PushToken.token` value issued by the magic-link verify flow.

### Get current user
```bash
curl -s http://localhost:4000/consumer/me \
  -H "Authorization: Bearer <consumer-token>" | jq
```

### Register/update Expo push token
```bash
curl -s -X POST http://localhost:4000/consumer/me/push-token \
  -H "Authorization: Bearer <consumer-token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]","platform":"IOS"}' | jq
```

### List discount codes available to the logged-in user
```bash
curl -s http://localhost:4000/consumer/me/discount-codes \
  -H "Authorization: Bearer <consumer-token>" | jq
```

### Redeem a discount code
```bash
curl -s -X POST http://localhost:4000/consumer/discount-codes/redeem \
  -H "Authorization: Bearer <consumer-token>" \
  -H "Content-Type: application/json" \
  -d '{"code":"SUMMER20"}' | jq
```
