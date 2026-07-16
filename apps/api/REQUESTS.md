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

## Consumer routes (require Bearer consumer token)

The consumer token is a `PushToken.token` value. The OTP/email verification flow that issues these tokens will be implemented in Todo 9.

### Get current user
```bash
curl -s http://localhost:4000/consumer/me \
  -H "Authorization: Bearer <consumer-token>" | jq
```

### Redeem a discount code
```bash
curl -s -X POST http://localhost:4000/consumer/discount-codes/redeem \
  -H "Authorization: Bearer <consumer-token>" \
  -H "Content-Type: application/json" \
  -d '{"code":"SUMMER20"}' | jq
```
