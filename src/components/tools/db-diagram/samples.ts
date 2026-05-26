export interface SampleSchema {
  id: string;
  name: string;
  description: string;
  dbml: string;
}

const BLOG = `Table users [headercolor: #14b8a6] {
  id int [pk, increment]
  email varchar(255) [unique, not null]
  name varchar(120)
  created_at timestamp [default: \`now()\`]
  Note: 'Authenticated app users'
}

Table posts [headercolor: #6366f1] {
  id int [pk, increment]
  user_id int [ref: > users.id, not null]
  title varchar(200) [not null]
  body text
  published_at timestamp
  views int [default: 0]

  indexes {
    user_id [name: 'idx_posts_user']
    (published_at, user_id) [name: 'idx_posts_feed']
  }
}

Table comments [headercolor: #f59e0b] {
  id int [pk, increment]
  post_id int [ref: > posts.id, not null]
  user_id int [ref: > users.id, not null]
  body text [not null]
  created_at timestamp
}

Table tags {
  id int [pk, increment]
  name varchar(80) [unique, not null]
}

Table post_tags {
  post_id int [ref: > posts.id]
  tag_id int [ref: > tags.id]
  indexes {
    (post_id, tag_id) [pk]
  }
}`;

const ECOMMERCE = `enum order_status {
  pending
  paid
  shipped
  delivered
  cancelled
  refunded
}

Table customers [headercolor: #14b8a6] {
  id uuid [pk]
  email varchar(255) [unique, not null]
  first_name varchar(80) [not null]
  last_name varchar(80) [not null]
  phone varchar(40)
  created_at timestamp [default: \`now()\`]
}

Table addresses {
  id uuid [pk]
  customer_id uuid [ref: > customers.id, not null]
  line1 varchar(200) [not null]
  city varchar(100) [not null]
  country varchar(100) [not null]
  is_default boolean [default: false]
}

Table products [headercolor: #6366f1] {
  id uuid [pk]
  sku varchar(64) [unique, not null]
  title varchar(200) [not null]
  description text
  price decimal(10,2) [not null]
  stock int [default: 0]
  active boolean [default: true]
  created_at timestamp [default: \`now()\`]
  indexes {
    (active, sku) [name: 'idx_products_active_sku']
  }
}

Table categories {
  id int [pk, increment]
  name varchar(120) [unique, not null]
  parent_id int [ref: > categories.id]
}

Table product_categories {
  product_id uuid [ref: > products.id]
  category_id int [ref: > categories.id]
  indexes {
    (product_id, category_id) [pk]
  }
}

Table orders [headercolor: #f59e0b] {
  id uuid [pk]
  customer_id uuid [ref: > customers.id, not null]
  shipping_address_id uuid [ref: > addresses.id]
  status order_status [not null, default: 'pending']
  subtotal decimal(10,2) [not null]
  total decimal(10,2) [not null]
  placed_at timestamp [default: \`now()\`]
  indexes {
    (customer_id, status)
  }
}

Table order_items {
  id bigint [pk, increment]
  order_id uuid [ref: > orders.id, not null]
  product_id uuid [ref: > products.id, not null]
  quantity int [not null, default: 1]
  unit_price decimal(10,2) [not null]
}

Table payments [headercolor: #f87171] {
  id uuid [pk]
  order_id uuid [ref: > orders.id, not null]
  amount decimal(10,2) [not null]
  provider varchar(40)
  paid_at timestamp
}`;

const SAAS = `Table tenants [headercolor: #14b8a6] {
  id uuid [pk]
  slug varchar(80) [unique, not null]
  name varchar(200) [not null]
  plan varchar(40) [default: 'free']
  created_at timestamp [default: \`now()\`]
}

Table users [headercolor: #6366f1] {
  id uuid [pk]
  tenant_id uuid [ref: > tenants.id, not null]
  email varchar(255) [not null]
  name varchar(120)
  role varchar(40) [default: 'member']
  last_login_at timestamp
  created_at timestamp [default: \`now()\`]
  indexes {
    (tenant_id, email) [unique]
  }
}

Table api_keys {
  id uuid [pk]
  tenant_id uuid [ref: > tenants.id, not null]
  user_id uuid [ref: > users.id]
  prefix varchar(12) [not null]
  hashed_key varchar(120) [not null]
  scopes varchar(200)
  revoked_at timestamp
  created_at timestamp [default: \`now()\`]
}

Table audit_logs [headercolor: #f59e0b] {
  id bigint [pk, increment]
  tenant_id uuid [ref: > tenants.id, not null]
  user_id uuid [ref: > users.id]
  action varchar(120) [not null]
  resource varchar(120)
  resource_id varchar(120)
  ip varchar(45)
  created_at timestamp [default: \`now()\`]
  indexes {
    (tenant_id, created_at) [name: 'idx_audit_tenant_time']
  }
}

Table subscriptions [headercolor: #f87171] {
  id uuid [pk]
  tenant_id uuid [ref: > tenants.id, unique, not null]
  status varchar(40) [not null]
  current_period_end timestamp
  cancel_at_period_end boolean [default: false]
}`;

const SOCIAL = `Table users [headercolor: #14b8a6] {
  id bigint [pk, increment]
  username varchar(40) [unique, not null]
  email varchar(255) [unique, not null]
  display_name varchar(120)
  avatar_url varchar(255)
  bio text
  created_at timestamp [default: \`now()\`]
}

Table follows {
  follower_id bigint [ref: > users.id]
  followee_id bigint [ref: > users.id]
  created_at timestamp [default: \`now()\`]
  indexes {
    (follower_id, followee_id) [pk]
  }
}

Table posts [headercolor: #6366f1] {
  id bigint [pk, increment]
  user_id bigint [ref: > users.id, not null]
  body text [not null]
  media_url varchar(255)
  reply_to_id bigint [ref: > posts.id]
  created_at timestamp [default: \`now()\`]
  indexes {
    (user_id, created_at)
  }
}

Table likes {
  user_id bigint [ref: > users.id]
  post_id bigint [ref: > posts.id]
  created_at timestamp [default: \`now()\`]
  indexes {
    (user_id, post_id) [pk]
  }
}

Table notifications [headercolor: #f59e0b] {
  id bigint [pk, increment]
  user_id bigint [ref: > users.id, not null]
  actor_id bigint [ref: > users.id]
  kind varchar(40) [not null]
  post_id bigint [ref: > posts.id]
  read_at timestamp
  created_at timestamp [default: \`now()\`]
}`;

const SIMPLE = `Table users {
  id int [pk, increment]
  email varchar(255) [unique, not null]
  name varchar(120)
  created_at timestamp [default: \`now()\`]
}`;

export const SAMPLES: SampleSchema[] = [
  { id: "blog", name: "Blog", description: "Users, posts, comments, tags", dbml: BLOG },
  { id: "ecommerce", name: "E-commerce", description: "Products, orders, customers, payments", dbml: ECOMMERCE },
  { id: "saas", name: "SaaS multi-tenant", description: "Tenants, users, API keys, audit logs", dbml: SAAS },
  { id: "social", name: "Social feed", description: "Posts, follows, likes, notifications", dbml: SOCIAL },
  { id: "simple", name: "Simple", description: "Just one users table", dbml: SIMPLE },
];

export function getSample(id: string): SampleSchema | undefined {
  return SAMPLES.find((s) => s.id === id);
}
