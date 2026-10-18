// The description of Brightcart: one source from which generate.mjs writes both renditions.
//
// Brightcart is invented: an online retailer of home and garden goods that changes its architecture over four plateaus
// (`baseline`, then the alternatives `saas` and `inhouse`, then `marketplace` under `inhouse`). Nothing here comes from a real workspace.
// The specification is docs/fixtures/brightcart-spec.md; this file is the data it describes.
//
// An element is { ref, kind, name, desc, q (qualifiers), tags, rels, apps (applications hosted), uses, replaces, layer, file }.
// A plateau declares elements (its manifests) and then applies its patches in order (see generate.mjs for the operators).

const T = 'technology';
const EXT = { 'rendering-stereotypes': 'external' };

export function E(ref, kind, name, desc = '', o = {}) {
  return {
    ref,
    kind,
    name,
    desc,
    q: [...(o.q || [])],
    tags: { ...(o.tags || {}) },
    rels: (o.rels || []).map((r) => ({ dest: r[0], label: r[1], q: [...(r[2] || [])] })),
    apps: [...(o.apps || [])],
    uses: [...(o.uses || [])],
    replaces: [...(o.replaces || [])],
    layer: o.layer || 'application',
    file: null
  };
}

export class Plateau {
  constructor(id, name, horizon, parent, summary) {
    Object.assign(this, { id, name, horizon, parent, summary, manifests: [], patches: [] });
  }
  declare(e, file) {
    e.file = file;
    this.manifests.push(e);
    return e;
  }
  op(operator, kw = {}) {
    this.patches.push({ operator, ...kw });
  }
}

export function build() {
  const P = {};

  // ------------------------------------------------------------------ baseline: the monolith
  const b = new Plateau('baseline', 'Monolith', '2026-Q1', null, 'one Java monolith, one data centre');
  let A = 'baseline/application/';
  let D = 'baseline/technology/';
  const baselineApplication = [
    [E('customer', 'person', 'Shopper', 'Someone who buys from the web shop.', { rels: [['shop.web', 'browses and buys with', ['HTTPS']]] }), 'customer.yaml'],
    [E('agent', 'person', 'Support agent', 'Handles customer requests and orders.', { rels: [['backoffice.console', 'handles orders with']] }), 'agent.yaml'],
    [E('merchandiser', 'person', 'Merchandiser', 'Maintains products and promotions.', { rels: [['backoffice.console', 'maintains the catalog with']] }), 'merchandiser.yaml'],
    [E('psp', 'system', 'Payment provider', 'Authorises card and wallet payments.', { tags: EXT }), 'psp.yaml'],
    [E('tax', 'system', 'Tax service', 'Computes sales taxes per destination.', { tags: EXT }), 'tax.yaml'],
    [E('carrier', 'system', 'Carrier API', 'Books parcels and returns tracking numbers.', { tags: EXT }), 'carrier.yaml'],
    [E('erp', 'system', 'ERP', 'Master of stock, purchases and accounting.', { tags: EXT }), 'erp.yaml'],
    [E('mailer', 'system', 'Mail provider', 'Delivers transactional mails.', { tags: EXT }), 'mailer.yaml'],
    [E('shop', 'system', 'Shop', 'The web shop of the retailer.'), 'shop.yaml'],
    [E('shop.web', 'container', 'Web storefront', 'Pages of the shop, in the browser.', { q: ['React'], rels: [['shop.app', 'calls', ['JSON/HTTPS']]] }), 'shop.yaml'],
    [E('shop.app', 'container', 'Shop application', 'The monolith that runs every shop feature.', { q: ['Java', 'Spring Boot'] }), 'shop.app.yaml'],
    [E('shop.db', 'container', 'Shop database', 'Products, accounts, orders and stock.', { q: ['PostgreSQL'] }), 'shop.yaml'],
    [E('shop.cache', 'container', 'Session cache', 'Baskets and sessions.', { q: ['Redis'] }), 'shop.yaml'],
    [E('shop.app.catalog', 'component', 'Catalog', 'Products, prices and availability.', { rels: [['shop.db', 'reads and writes']] }), 'shop.app.yaml'],
    [E('shop.app.search', 'component', 'Search', 'Full-text search over products.', { rels: [['shop.db', 'queries']] }), 'shop.app.yaml'],
    [E('shop.app.cart', 'component', 'Cart', 'Keeps the basket of a shopper.', { rels: [['shop.cache', 'keeps baskets in']] }), 'shop.app.yaml'],
    [
      E('shop.app.checkout', 'component', 'Checkout', 'Turns a basket into an order.', {
        rels: [
          ['shop.app.cart', 'reads baskets from'],
          ['shop.app.orders', 'creates orders in'],
          ['shop.app.payments', 'pays through'],
          ['tax', 'computes taxes with', ['HTTPS']],
          ['shop.app.inventory', 'reserves stock in']
        ]
      }),
      'shop.app.yaml'
    ],
    [E('shop.app.orders', 'component', 'Orders', 'Stores orders and their history.', { rels: [['shop.db', 'stores orders in'], ['shop.app.notifications', 'asks to notify']] }), 'shop.app.yaml'],
    [E('shop.app.customers', 'component', 'Customers', 'Accounts and addresses.', { rels: [['shop.db', 'stores accounts in']] }), 'shop.app.yaml'],
    [E('shop.app.loyalty', 'component', 'Loyalty', 'Points earned and spent.', { rels: [['shop.db', 'stores points in'], ['shop.app.customers', 'reads accounts from']] }), 'shop.app.yaml'],
    [E('shop.app.promotions', 'component', 'Promotions', 'Discount rules and vouchers.', { rels: [['shop.db', 'reads rules from']] }), 'shop.app.yaml'],
    [E('shop.app.payments', 'component', 'Payments', 'Talks to the payment provider.', { rels: [['psp', 'authorises payments with', ['HTTPS']]] }), 'shop.app.yaml'],
    [E('shop.app.notifications', 'component', 'Notifications', 'Mails about orders and accounts.', { rels: [['mailer', 'sends mails with', ['SMTP']]] }), 'shop.app.yaml'],
    [E('shop.app.inventory', 'component', 'Inventory', 'Stock levels and reservations.', { rels: [['shop.db', 'reads and reserves stock in']] }), 'shop.app.yaml'],
    [E('backoffice', 'system', 'Back office', 'Tools of the staff.'), 'backoffice.yaml'],
    [
      E('backoffice.console', 'container', 'Back-office console', 'Products, orders and customers for the staff.', {
        q: ['Angular'],
        rels: [
          ['shop.app.catalog', 'maintains products in'],
          ['shop.app.orders', 'handles orders in'],
          ['shop.app.promotions', 'configures promotions in'],
          ['shop.app.customers', 'looks up customers in']
        ]
      }),
      'backoffice.yaml'
    ],
    [E('fulfilment', 'system', 'Fulfilment', 'Picks, packs and ships.'), 'fulfilment.yaml'],
    [
      E('fulfilment.sync', 'container', 'Order and stock sync', 'Nightly exchange of orders and stock with the ERP.', {
        q: ['Batch job'],
        rels: [
          ['shop.db', 'reads orders, writes stock levels'],
          ['erp', 'exchanges orders and stock with', ['SFTP']],
          ['carrier', 'books shipments with', ['HTTPS']]
        ]
      }),
      'fulfilment.yaml'
    ]
  ];
  for (const [e, f] of baselineApplication) b.declare(e, A + f);
  const nodes = [
    ['prod', 'Production', 'environment', [], ['partners']],
    ['prod.dc', 'Paris data centre', 'node', [], []],
    ['prod.dc.web-vm', 'Web VM', 'node', ['shop.web'], []],
    ['prod.dc.app-vm', 'Application VM', 'node', ['shop.app'], []],
    ['prod.dc.db-vm', 'Database VM', 'node', ['shop.db'], []],
    ['prod.dc.cache-vm', 'Cache VM', 'node', ['shop.cache'], []],
    ['prod.dc.batch-vm', 'Batch VM', 'node', ['fulfilment.sync'], []],
    ['prod.dc.admin-vm', 'Admin VM', 'node', ['backoffice.console'], []],
    ['staging', 'Staging', 'environment', [], ['sandbox']],
    ['staging.vm', 'Staging VM', 'node', ['shop.web', 'shop.app', 'shop.db', 'shop.cache', 'fulfilment.sync', 'backoffice.console'], []],
    ['partners', 'Partners (live)', 'environment', [], []],
    ['sandbox', 'Partners (sandbox)', 'environment', [], []]
  ];
  for (const [ref, name, kind, apps, uses] of nodes) b.declare(E(ref, kind, name, '', { layer: T, apps, uses }), D + ref.split('.')[0] + '.yaml');
  const partnerApplication = { psp: 'psp', tax: 'tax', carrier: 'carrier', erp: 'erp', mail: 'mailer' };
  const partnerName = { psp: 'Payment provider', tax: 'Tax service', carrier: 'Carrier API', erp: 'ERP', mail: 'Mail provider' };
  for (const p of ['psp', 'tax', 'carrier', 'erp', 'mail']) {
    b.declare(E(`partners.${p}-live`, 'node', `${partnerName[p]} (live)`, '', { layer: T, apps: [partnerApplication[p]] }), D + 'partners.yaml');
    b.declare(E(`sandbox.${p}-sandbox`, 'node', `${partnerName[p]} (sandbox)`, '', { layer: T, apps: [partnerApplication[p]] }), D + 'sandbox.yaml');
  }
  P.baseline = b;

  // ------------------------------------------------------------------ saas (alternative 0: buy)
  const s = new Plateau('saas', 'Buy the commerce platform', '2026-Q4', 'baseline', 'a SaaS commerce platform takes the catalog, cart and checkout');
  A = 'saas/application/';
  D = 'saas/technology/';
  s.declare(
    E('commerce-saas', 'system', 'Commerce platform (SaaS)', 'Hosted catalog, cart, checkout and promotions.', {
      tags: EXT,
      rels: [['shop.app.orders', 'sends order webhooks to', ['HTTPS']], ['psp', 'authorises payments with', ['HTTPS']]]
    }),
    A + 'commerce-saas.yaml'
  );
  s.declare(E('partners.commerce-live', 'node', 'Commerce platform (live)', '', { layer: T, apps: ['commerce-saas'] }), D + 'partners.commerce-live.yaml');
  s.declare(E('sandbox.commerce-sandbox', 'node', 'Commerce platform (sandbox)', '', { layer: T, apps: ['commerce-saas'] }), D + 'sandbox.commerce-sandbox.yaml');
  for (const c of ['catalog', 'search', 'cart', 'checkout', 'payments', 'promotions']) {
    s.op('REMOVE', { target: 'shop.app.' + c, comment: c === 'catalog' ? 'what the platform replaces' : undefined });
  }
  s.op('REMOVE', { target: 'shop.cache', comment: 'no longer needed' });
  s.op('REMOVE', { target: 'tax', comment: 'the platform computes taxes' });
  s.op('REMOVE', { target: 'prod.dc.cache-vm', layer: T, comment: 'REMOVE does not take the nodes that hosted what is gone' });
  s.op('REMOVE', { target: 'partners.tax-live', layer: T });
  s.op('REMOVE', { target: 'sandbox.tax-sandbox', layer: T });
  s.op('SET', { target: 'shop.web', field: 'description', value: 'Headless storefront on the commerce platform.', comment: 'the storefront talks to the platform' });
  s.op('SET', { target: 'shop.web', field: 'qualifiers', value: ['React', 'Next.js'] });
  s.op('ADD_REL', { target: 'shop.web', rel: ['commerce-saas', 'browses and checks out with', ['GraphQL']] });
  s.op('SET', { target: 'shop.app', field: 'name', value: 'Account and order history', comment: 'what is left of the application' });
  s.op('SET', { target: 'shop.app', field: 'description', value: 'Accounts, loyalty, order history and stock; the rest moved to the platform.' });
  s.op('ADD_REL', { target: 'backoffice.console', rel: ['commerce-saas', 'maintains products in', ['HTTPS']], comment: 'the staff tools' });
  s.op('SET_REL', { target: 'fulfilment.sync', dest: 'shop.db', label: 'reads orders, writes stock levels', new_label: 'writes stock levels', comment: 'the nightly batch' });
  s.op('ADD_REL', { target: 'fulfilment.sync', rel: ['commerce-saas', 'pulls orders from', ['REST']] });
  P.saas = s;

  // ------------------------------------------------------------------ inhouse (alternative 1: build)
  const h = new Plateau('inhouse', 'Build commerce services', '2026-Q4', 'baseline', 'catalog, cart, checkout, pricing, payments, orders and accounts leave the monolith');
  A = 'inhouse/application/';
  D = 'inhouse/technology/';
  const QK = ['Java', 'Quarkus'];
  h.declare(E('commerce', 'system', 'Commerce services', 'Services of the shopping journey.'), A + 'commerce.yaml');
  h.declare(E('commerce.cart-store', 'container', 'Cart store', 'Baskets, one key per shopper.', { q: ['Redis'], replaces: ['shop.cache'] }), A + 'commerce.yaml');
  h.declare(
    E('commerce.gateway', 'container', 'API gateway', 'Single entry for the storefront.', {
      q: ['Kong'],
      rels: [['commerce.catalog', 'routes to'], ['commerce.search', 'routes to'], ['commerce.cart', 'routes to'], ['commerce.checkout', 'routes to'], ['commerce.pricing', 'routes to']]
    }),
    A + 'commerce.yaml'
  );
  h.declare(E('commerce.catalog', 'container', 'Catalog service', 'Products, prices and availability.', { q: QK, rels: [['commerce.catalog-db', 'reads and writes']], replaces: ['shop.app.catalog'] }), A + 'commerce.catalog.yaml');
  h.declare(E('commerce.catalog-db', 'container', 'Catalog database', 'Products and prices.', { q: ['PostgreSQL'] }), A + 'commerce.yaml');
  h.declare(E('commerce.search', 'container', 'Search service', 'Full-text search over products.', { q: ['OpenSearch'], rels: [['commerce.catalog', 'indexes products from']], replaces: ['shop.app.search'] }), A + 'commerce.search.yaml');
  h.declare(E('commerce.cart', 'container', 'Cart service', 'Keeps the basket of a shopper.', { q: QK, rels: [['commerce.cart-store', 'keeps baskets in']], replaces: ['shop.app.cart'] }), A + 'commerce.cart.yaml');
  h.declare(
    E('commerce.checkout', 'container', 'Checkout service', 'Turns a basket into an order.', {
      q: QK,
      rels: [
        ['commerce.cart', 'reads baskets from'],
        ['orders.placement', 'creates orders in'],
        ['payments.orchestrator', 'pays through'],
        ['tax', 'computes taxes with', ['HTTPS']],
        ['shop.app.inventory', 'reserves stock in']
      ],
      replaces: ['shop.app.checkout']
    }),
    A + 'commerce.checkout.yaml'
  );
  h.declare(E('commerce.pricing', 'container', 'Pricing service', 'Discount rules and vouchers.', { q: QK, rels: [['commerce.catalog', 'reads prices from']], replaces: ['shop.app.promotions'] }), A + 'commerce.pricing.yaml');
  h.declare(E('payments', 'system', 'Payments', 'Everything about moving money.'), A + 'payments.yaml');
  h.declare(E('payments.orchestrator', 'container', 'Payment orchestrator', 'Talks to the payment provider.', { q: QK, rels: [['psp', 'authorises payments with', ['HTTPS']]], replaces: ['shop.app.payments'] }), A + 'payments.yaml');
  h.declare(E('orders', 'system', 'Order management', 'Orders from placement to history.'), A + 'orders.yaml');
  h.declare(E('orders.placement', 'container', 'Order placement', 'Creates and confirms orders.', { q: QK, rels: [['orders.db', 'stores orders in'], ['shop.app.notifications', 'asks to notify']], replaces: ['shop.app.orders'] }), A + 'orders.yaml');
  h.declare(E('orders.history', 'container', 'Order history', 'Read model of past orders.', { q: QK, rels: [['orders.db', 'reads orders from']], replaces: ['shop.app.orders'] }), A + 'orders.yaml');
  h.declare(E('orders.db', 'container', 'Orders database', 'Orders and their events.', { q: ['PostgreSQL'] }), A + 'orders.yaml');
  h.declare(E('accounts', 'system', 'Accounts', 'Who the shoppers are.'), A + 'accounts.yaml');
  h.declare(E('accounts.profiles', 'container', 'Customer profiles', 'Accounts, addresses and loyalty points.', { q: QK, rels: [['accounts.db', 'stores accounts in']], replaces: ['shop.app.customers', 'shop.app.loyalty'] }), A + 'accounts.yaml');
  h.declare(E('accounts.db', 'container', 'Accounts database', 'Accounts and points.', { q: ['PostgreSQL'] }), A + 'accounts.yaml');
  // technology
  h.declare(E('prod.cloud', 'node', 'Cloud region eu-west', '', { layer: T }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.k8s', 'node', 'Kubernetes cluster', '', { layer: T }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.k8s.commerce', 'node', 'Commerce namespace', '', { layer: T, apps: ['commerce.gateway', 'commerce.catalog', 'commerce.search', 'commerce.cart', 'commerce.checkout', 'commerce.pricing'] }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.k8s.payments', 'node', 'Payments namespace', '', { layer: T, apps: ['payments.orchestrator'] }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.k8s.orders', 'node', 'Orders namespace', '', { layer: T, apps: ['orders.placement', 'orders.history'] }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.k8s.accounts', 'node', 'Accounts namespace', '', { layer: T, apps: ['accounts.profiles'] }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.pg', 'node', 'Managed PostgreSQL', '', { layer: T, apps: ['commerce.catalog-db', 'orders.db', 'accounts.db'] }), D + 'prod.cloud.yaml');
  h.declare(E('prod.cloud.redis', 'node', 'Managed Redis', '', { layer: T }), D + 'prod.cloud.yaml');
  h.declare(
    E('staging.k8s', 'node', 'Staging cluster', '', {
      layer: T,
      apps: ['commerce.gateway', 'commerce.catalog', 'commerce.catalog-db', 'commerce.search', 'commerce.cart', 'commerce.checkout', 'commerce.pricing', 'payments.orchestrator', 'orders.placement', 'orders.history', 'orders.db', 'accounts.profiles', 'accounts.db']
    }),
    D + 'staging.k8s.yaml'
  );
  // the cache moves to another parent and id: no operator does that, so the new manifest says replaces and the old element is removed (its entries in the nodes go with it)
  h.op('REMOVE', { target: 'shop.cache', comment: 'pattern R: commerce.cart-store says replaces; the cascade takes the entries of the nodes that hosted the cache' });
  for (const c of ['catalog', 'search', 'cart', 'checkout', 'payments', 'promotions', 'orders', 'customers', 'loyalty']) {
    h.op('REMOVE', { target: 'shop.app.' + c, comment: c === 'catalog' ? 'pattern R: the new containers say replaces, the old components go' : undefined });
  }
  h.op('SET', { target: 'shop.app', field: 'name', value: 'Legacy core', comment: 'the monolith is reduced' });
  h.op('SET', { target: 'shop.app', field: 'description', value: 'What is left of the monolith: stock levels and notifications.' });
  h.op('SET', { target: 'shop.app', field: 'tags', value: { 'rendering-stereotypes': 'legacy' } });
  h.op('SET', { target: 'shop.web', field: 'description', value: 'Pages of the shop, served behind the API gateway.', comment: 'the storefront' });
  h.op('ADD_REL', { target: 'shop.web', rel: ['commerce.gateway', 'browses and buys through', ['REST']] });
  h.op('ADD_APP', { target: 'prod.cloud.redis', layer: T, values: ['commerce.cart-store'], comment: 'deployment' });
  h.op('ADD_APP', { target: 'staging.k8s', layer: T, values: ['commerce.cart-store'] });
  h.op('SET', { target: 'staging.vm', layer: T, field: 'applications', value: ['shop.web', 'shop.app', 'shop.db', 'fulfilment.sync', 'backoffice.console'] });
  h.op('REMOVE', { target: 'prod.dc.cache-vm', layer: T });
  let first = true;
  for (const [ref, dest, label] of [
    ['backoffice.console', 'commerce.catalog', 'maintains products in'],
    ['backoffice.console', 'commerce.pricing', 'configures promotions in'],
    ['backoffice.console', 'orders.placement', 'handles orders in'],
    ['backoffice.console', 'orders.history', 'looks up past orders in'],
    ['backoffice.console', 'accounts.profiles', 'looks up customers in']
  ]) {
    h.op('ADD_REL', { target: ref, rel: [dest, label, []], comment: first ? 'the staff tools follow' : undefined });
    first = false;
  }
  h.op('SET_REL', { target: 'fulfilment.sync', dest: 'shop.db', label: 'reads orders, writes stock levels', new_label: 'writes stock levels', comment: 'the nightly batch' });
  h.op('ADD_REL', { target: 'fulfilment.sync', rel: ['orders.db', 'reads orders from', ['SQL']] });
  P.inhouse = h;

  // ------------------------------------------------------------------ marketplace (under inhouse only)
  const m = new Plateau('marketplace', 'Marketplace and personalisation', '2027-Q4', 'inhouse', 'third-party sellers, events, recommendations, the monolith is retired');
  A = 'marketplace/application/';
  D = 'marketplace/technology/';
  m.declare(E('seller', 'person', 'Marketplace seller', 'A third party that lists offers.', { rels: [['marketplace.seller-portal', 'lists offers with']] }), A + 'seller.yaml');
  m.declare(E('kyc', 'system', 'KYC provider', 'Checks the identity of sellers.', { tags: EXT }), A + 'kyc.yaml');
  m.declare(E('marketplace', 'system', 'Marketplace', 'Offers of third-party sellers.'), A + 'marketplace.yaml');
  m.declare(E('marketplace.seller-portal', 'container', 'Seller portal', 'Where sellers manage offers and payouts.', { q: ['React'], rels: [['marketplace.listing', 'manages offers with'], ['marketplace.settlement', 'reads payouts from']] }), A + 'marketplace.yaml');
  m.declare(E('marketplace.listing', 'container', 'Listing service', 'Validates and publishes offers.', { q: QK, rels: [['marketplace.db', 'stores offers in'], ['commerce.catalog', 'publishes offers to'], ['kyc', 'checks sellers with', ['HTTPS']]] }), A + 'marketplace.yaml');
  m.declare(E('marketplace.settlement', 'container', 'Settlement service', 'Computes and pays out seller balances.', { q: QK, rels: [['marketplace.db', 'stores balances in'], ['payments.orchestrator', 'pays out through']] }), A + 'marketplace.yaml');
  m.declare(E('marketplace.db', 'container', 'Marketplace database', 'Offers and balances.', { q: ['PostgreSQL'] }), A + 'marketplace.yaml');
  m.declare(E('platform', 'system', 'Platform', 'Shared services.'), A + 'platform.yaml');
  m.declare(E('platform.broker', 'container', 'Event backbone', 'Domain events between services.', { q: ['Kafka'] }), A + 'platform.yaml');
  m.declare(E('platform.notifications', 'container', 'Notification service', 'Mails and pushes about orders and accounts.', { q: QK, rels: [['mailer', 'sends mails with', ['SMTP']], ['platform.broker', 'consumes events from']], replaces: ['shop.app.notifications'] }), A + 'platform.yaml');
  m.declare(E('discovery', 'system', 'Discovery', 'Search and recommendations.'), A + 'discovery.yaml');
  m.declare(E('discovery.recommender', 'container', 'Recommender', 'Suggests products to a shopper.', { q: ['Python'], rels: [['platform.broker', 'consumes events from'], ['discovery.features', 'reads features from']] }), A + 'discovery.yaml');
  m.declare(E('discovery.features', 'container', 'Feature store', 'Shopper and product features.', { q: ['Redis'] }), A + 'discovery.yaml');
  m.declare(E('discovery.search', 'container', 'Search service', 'Full-text search over products.', { q: ['OpenSearch'], rels: [['commerce.catalog', 'indexes products from']], replaces: ['commerce.search'] }), A + 'discovery.yaml');
  m.declare(E('fulfilment.inventory', 'container', 'Inventory service', 'Stock levels and reservations.', { q: QK, rels: [['fulfilment.db', 'reads and reserves stock in'], ['platform.broker', 'publishes stock events to']], replaces: ['shop.app.inventory'] }), A + 'fulfilment.inventory.yaml');
  m.declare(E('fulfilment.db', 'container', 'Fulfilment database', 'Stock levels.', { q: ['PostgreSQL'] }), A + 'fulfilment.db.yaml');
  m.declare(E('storefront', 'system', 'Shop', 'The web shop of the retailer.', { replaces: ['shop'] }), A + 'storefront.yaml');
  m.declare(E('storefront.web', 'container', 'Web storefront', 'Pages of the shop, served from the CDN.', { q: ['React'], rels: [['commerce.gateway', 'browses and buys through', ['REST']]], replaces: ['shop.web'] }), A + 'storefront.yaml');
  m.declare(E('storefront.mobile', 'container', 'Mobile app', 'The shop in the pocket.', { q: ['Kotlin Multiplatform'], rels: [['commerce.gateway', 'browses and buys through', ['REST']]] }), A + 'storefront.mobile.yaml');
  // technology
  m.declare(E('prod.cloud.cdn', 'node', 'CDN', '', { layer: T, apps: ['storefront.web'] }), D + 'prod.cloud.cdn.yaml');
  m.declare(E('prod.cloud.k8s.marketplace', 'node', 'Marketplace namespace', '', { layer: T, apps: ['marketplace.seller-portal', 'marketplace.listing', 'marketplace.settlement'] }), D + 'prod.cloud.k8s.marketplace.yaml');
  m.declare(E('prod.cloud.k8s.platform', 'node', 'Platform namespace', '', { layer: T, apps: ['platform.notifications', 'discovery.recommender', 'fulfilment.inventory'] }), D + 'prod.cloud.k8s.platform.yaml');
  m.declare(E('prod.cloud.kafka', 'node', 'Managed Kafka', '', { layer: T, apps: ['platform.broker'] }), D + 'prod.cloud.kafka.yaml');
  m.declare(E('partners.kyc-live', 'node', 'KYC (live)', '', { layer: T, apps: ['kyc'] }), D + 'partners.kyc-live.yaml');
  m.declare(E('sandbox.kyc-sandbox', 'node', 'KYC (sandbox)', '', { layer: T, apps: ['kyc'] }), D + 'sandbox.kyc-sandbox.yaml');
  m.declare(
    E('staging.platform', 'node', 'Staging cluster (platform)', '', {
      layer: T,
      apps: ['marketplace.seller-portal', 'marketplace.listing', 'marketplace.settlement', 'marketplace.db', 'platform.broker', 'platform.notifications', 'discovery.recommender', 'discovery.features', 'fulfilment.inventory', 'fulfilment.db']
    }),
    D + 'staging.platform.yaml'
  );
  // patches: retire the monolith, rewire what pointed at it, move, deploy, describe, tag
  m.op('REMOVE', { target: 'shop.app', comment: 'retire the monolith; inventory and notifications are replaced by the manifests of this plateau' });
  m.op('REMOVE', { target: 'shop.db' });
  m.op('ADD_REL', { target: 'commerce.checkout', rel: ['fulfilment.inventory', 'reserves stock in', ['REST']], comment: 'rewire what pointed at the monolith (the REMOVE took those links)' });
  m.op('ADD_REL', { target: 'orders.placement', rel: ['platform.notifications', 'asks to notify'] });
  m.op('ADD_REL', { target: 'fulfilment.sync', rel: ['fulfilment.inventory', 'writes stock levels to', ['REST']] });
  m.op('REMOVE', { target: 'commerce.search', comment: 'a second move for this element: discovery.search says replaces' });
  m.op('ADD_REL', { target: 'commerce.gateway', rel: ['discovery.search', 'routes to'], comment: 'what pointed at the old search (the REMOVE took the link)' });
  m.op('ADD_APP', { target: 'prod.cloud.k8s.commerce', layer: T, values: ['discovery.search'], comment: 'and the nodes that hosted it' });
  m.op('ADD_APP', { target: 'staging.k8s', layer: T, values: ['discovery.search'] });
  m.op('REMOVE', { target: 'shop', comment: 'rename the system: storefront says replaces for shop and shop.web; the subtree goes' });
  m.op('ADD_REL', { target: 'customer', rel: ['storefront.web', 'browses and buys with', ['HTTPS']], comment: 'what pointed at the old storefront' });
  m.op('ADD_APP', { target: 'staging.vm', layer: T, values: ['storefront.web'] });
  m.op('SET', { target: 'commerce.catalog', field: 'description', value: 'Products, prices and availability, including offers of marketplace sellers.', comment: 'sellers, events, recommendations' });
  m.op('ADD_REL', { target: 'commerce.catalog', rel: ['platform.broker', 'publishes product events to'] });
  m.op('ADD_REL', { target: 'commerce.catalog', rel: ['discovery.recommender', 'asks for suggestions'] });
  m.op('ADD_REL', { target: 'orders.placement', rel: ['platform.broker', 'publishes order events to'] });
  m.op('SET', { target: 'commerce.gateway', field: 'tags', value: { 'rendering-stereotypes': 'hot-path' }, comment: 'drawing only: compare ignores it' });
  m.op('REMOVE', { target: 'prod.dc.web-vm', layer: T, comment: 'retire the virtual machines' });
  m.op('REMOVE', { target: 'prod.dc.app-vm', layer: T });
  m.op('REMOVE', { target: 'prod.dc.db-vm', layer: T });
  m.op('ADD_APP', { target: 'prod.cloud.pg', layer: T, values: ['marketplace.db', 'fulfilment.db'], comment: 'deployment' });
  m.op('ADD_APP', { target: 'prod.cloud.redis', layer: T, values: ['discovery.features'] });
  m.op('MERGE_WHERE', { qualifier: 'Quarkus', field: 'tags', value: { runtime: 'quarkus' }, comment: 'a bulk edit written by hand, guarded by expect' });
  P.marketplace = m;
  return P;
}

export const ORDER = ['baseline', 'saas', 'inhouse', 'marketplace'];

// The number of PlantUML files `views generate` writes for each plateau (default views, no manifest views yet), as the current command line gives it.
export const VIEWS = { baseline: 109, saas: 93, inhouse: 147, marketplace: 181 };

// What workspace.yaml holds in both renditions (section 4 of the specification). Facets are evaluated by the kernel, as standard JSONPath (RFC 9535).
export const WORKSPACE_SETTINGS = `  name: "Brightcart"
  views:
    path: "views"
  facets:
    customs:
      - name: "journey"            # the purchase journey: no staff tools, no fulfilment
        actions:
          - operator: REMOVE
            json-path: "$.application..elements[?(@.id == 'agent' || @.id == 'merchandiser' || @.id == 'backoffice' || @.id == 'fulfilment')]"
      - name: "no-externals"       # what Brightcart builds, without its partners
        actions:
          - operator: REMOVE
            json-path: "$.application..elements[?(@.tags['rendering-stereotypes'] == 'external')]"
      - name: "without-cart"       # selects nothing in \`saas\`, where the cart is gone
        actions:
          - operator: REMOVE
            json-path: "$.application..elements[?(@.id == 'cart')]"
`;

export const WORKSPACE_STYLES = `styles:
  by-tags:
    external:
      background-color: "lightgray"
    legacy:
      line-style: 8
      line-gap: 4
    hot-path:
      line-color: "orangered"
      line-thickness: 3
  by-qualifiers:
    PostgreSQL:
      round-corner: 20
`;

// The comparisons of section 10. `chain` is the list of plateaus handed to the model (the first is the baseline); `command` says how the command line is asked the same question of
// `layered/` (`--against`; the plateau a plateau overrides is the default), or null when only the model answers.
export const COMPARISONS = [
  { id: 'P1', title: '`saas` vs `baseline`', chain: ['baseline', 'saas'], command: 'archicode diff --plateau saas', source: 'tool' },
  { id: 'P2', title: '`inhouse` vs `baseline`', chain: ['baseline', 'inhouse'], command: 'archicode diff --plateau inhouse', source: 'tool' },
  { id: 'P3', title: '`marketplace` vs `inhouse`', chain: ['inhouse', 'marketplace'], command: 'archicode diff --plateau marketplace', source: 'tool' },
  { id: 'P4', title: '`marketplace` vs `baseline`, composed', chain: ['baseline', 'inhouse', 'marketplace'],
    command: 'archicode diff --plateau marketplace --against baseline',
    // What the tool prints for the same question: it reads the `replaces` of every layer of the chain, relative to the plateau compared with, and does not compose them (L9),
    // so `discovery.search` (which replaces `commerce.search`, itself a replacement of `shop.app.search`) is new and `shop.app.search` removed: one move less.
    gives: [39, 3, 7, 10, 2, 1, 35, 1, 9],
    ignored: 1,
    source: 'model',
    note: 'Needs the composition of `replaces` (L9). The tool does not compose them: it gives one move less (see `gives`).' },
  { id: 'P5', title: '`inhouse` vs `saas` (siblings)', chain: ['saas', 'inhouse'], command: 'archicode diff --plateau inhouse --against saas', source: 'tool' },
  { id: 'P6', title: '`marketplace` vs `baseline`, last step only', chain: ['baseline', 'marketplace'], command: null, source: 'model', note: 'What a tool that reads only the last step\'s `replaces` prints (the tool of waves 008 to 013, whose option for it no longer exists).' }
];

// The notable cases of section 10. `checks` are asserted against the model by the generator: { in: comparison, layer, ref, state } or { in, relationship: [source, destination, label], state }.
export const NOTABLE = [
  { id: 'N1', case: 'Plain addition', where: '`commerce.gateway`', state: 'P2: new', why: 'An element with outgoing relationships to five others.', checks: [{ in: 'P2', layer: 'application', ref: 'commerce.gateway', state: 'new' }] },
  {
    id: 'N2',
    case: 'Removal that reaches another element',
    where: '`shop.app.catalog` removed, `backoffice.console`',
    state: 'P1: removed; console changed',
    why: "The cascade of `REMOVE` takes two of the console's relationships, on top of the one it gains by an explicit `ADD`.",
    checks: [
      { in: 'P1', layer: 'application', ref: 'shop.app.catalog', state: 'removed' },
      { in: 'P1', layer: 'application', ref: 'backoffice.console', state: 'changed' }
    ]
  },
  {
    id: 'N3',
    case: 'Label change',
    where: '`fulfilment.sync` to `shop.db`',
    state: 'P1, P2: changed (label)',
    why: 'One removed and one new relationship between the same pair are one label change.',
    checks: [
      { in: 'P1', relationship: ['fulfilment.sync', 'shop.db', 'reads orders, writes stock levels'], state: 'label-changed' },
      { in: 'P2', relationship: ['fulfilment.sync', 'shop.db', 'reads orders, writes stock levels'], state: 'label-changed' }
    ]
  },
  { id: 'N4', case: 'Move with a change of kind', where: '`shop.app.cart` to `commerce.cart`', state: 'P2: moved', why: 'Component to container: a manifest that says `replaces`, and a `REMOVE` of the old element.', checks: [{ in: 'P2', layer: 'application', ref: 'commerce.cart', state: 'moved' }] },
  {
    id: 'N5',
    case: 'Move to another parent',
    where: '`shop.cache` to `commerce.cart-store`',
    state: 'P2: moved',
    why: 'New parent, new id, new name: a manifest that says `replaces`, and a `REMOVE` whose cascade takes the entry of the nodes that hosted the cache; `staging.vm` follows.',
    checks: [
      { in: 'P2', layer: 'application', ref: 'commerce.cart-store', state: 'moved' },
      { in: 'P2', layer: 'technology', ref: 'staging.vm', state: 'changed' }
    ]
  },
  {
    id: 'N6',
    case: 'Split',
    where: '`shop.app.orders` to `orders.placement`, `orders.history`',
    state: 'P2: split (2)',
    why: 'The relationships of a split element are not compared: they all read as new.',
    checks: [
      { in: 'P2', layer: 'application', ref: 'orders.placement', state: 'split' },
      { in: 'P2', layer: 'application', ref: 'orders.history', state: 'split' }
    ]
  },
  {
    id: 'N7',
    case: 'Merge',
    where: '`shop.app.customers`, `shop.app.loyalty` to `accounts.profiles`',
    state: 'P2: merged',
    why: 'The link between the two merged elements becomes a self-link of the result and reads as removed.',
    checks: [{ in: 'P2', layer: 'application', ref: 'accounts.profiles', state: 'merged' }]
  },
  {
    id: 'N8',
    case: 'Moved twice',
    where: '`shop.app.search`, `commerce.search`, `discovery.search`',
    state: 'P2: moved; P3: moved; P4: moved from `shop.app.search`',
    why: 'Needs the composition of `replaces` (L9). P6 gets it wrong.',
    checks: [
      { in: 'P2', layer: 'application', ref: 'commerce.search', state: 'moved' },
      { in: 'P3', layer: 'application', ref: 'discovery.search', state: 'moved' },
      { in: 'P4', layer: 'application', ref: 'discovery.search', state: 'moved' },
      { in: 'P6', layer: 'application', ref: 'discovery.search', state: 'new' }
    ]
  },
  {
    id: 'N9',
    case: 'Subtree renamed',
    where: '`shop`, `shop.web` to `storefront`, `storefront.web`; `storefront.mobile`',
    state: 'P3: moved (2), `storefront.mobile` new',
    why: 'The new system is a manifest that says `replaces`, with its children, the new one among them; a `REMOVE` of `shop` takes the old subtree, and the links to it are written again.',
    checks: [
      { in: 'P3', layer: 'application', ref: 'storefront', state: 'moved' },
      { in: 'P3', layer: 'application', ref: 'storefront.web', state: 'moved' },
      { in: 'P3', layer: 'application', ref: 'storefront.mobile', state: 'new' }
    ]
  },
  {
    id: 'N10',
    case: 'Destination replaced, qualifier added',
    where: '`commerce.checkout` to `fulfilment.inventory`',
    state: 'P3: changed (relationship)',
    why: 'The link follows the replaced destination; only its qualifier (`REST`) differs.',
    checks: [{ in: 'P3', layer: 'application', ref: 'commerce.checkout', state: 'changed' }]
  },
  { id: 'N11', case: 'Render-only change', where: '`commerce.gateway` tag `hot-path`', state: 'P3: unchanged', why: '`rendering-*` tags are ignored by `compare`.', checks: [{ in: 'P3', layer: 'application', ref: 'commerce.gateway', state: 'none' }] },
  {
    id: 'N12',
    case: 'Bulk edit',
    where: '12 `Quarkus` containers, tag `runtime`',
    state: 'P3: changed for the ones that were not already',
    why: 'Five elements are changed by this and nothing else. The guard `expect: 12` is the contract.',
    checks: [{ in: 'P3', layer: 'application', ref: 'commerce.pricing', state: 'changed' }]
  },
  {
    id: 'N13',
    case: 'Box that only contains changes',
    where: '`shop` in P1 and P2, `prod.dc` in P1 to P4',
    state: 'contains-changes',
    why: 'No change of its own.',
    checks: [
      { in: 'P1', layer: 'application', ref: 'shop', state: 'contains-changes' },
      { in: 'P2', layer: 'application', ref: 'shop', state: 'contains-changes' },
      { in: 'P1', layer: 'technology', ref: 'prod.dc', state: 'contains-changes' },
      { in: 'P2', layer: 'technology', ref: 'prod.dc', state: 'contains-changes' },
      { in: 'P3', layer: 'technology', ref: 'prod.dc', state: 'contains-changes' },
      { in: 'P4', layer: 'technology', ref: 'prod.dc', state: 'contains-changes' }
    ]
  },
  {
    id: 'N14',
    case: 'Deployment follows',
    where: '`staging.vm`',
    state: 'P1, P2, P3: changed',
    why: 'Entry removed by a cascade (P1), replaced by `SET` (P2), cascade and `ADD` of the new name (P3).',
    checks: [
      { in: 'P1', layer: 'technology', ref: 'staging.vm', state: 'changed' },
      { in: 'P2', layer: 'technology', ref: 'staging.vm', state: 'changed' },
      { in: 'P3', layer: 'technology', ref: 'staging.vm', state: 'changed' }
    ]
  },
  {
    id: 'N15',
    case: 'Swap of a partner',
    where: '`tax` removed, `commerce-saas` new',
    state: 'P1',
    why: 'With their nodes in `partners` and `sandbox`.',
    checks: [
      { in: 'P1', layer: 'application', ref: 'tax', state: 'removed' },
      { in: 'P1', layer: 'application', ref: 'commerce-saas', state: 'new' },
      { in: 'P1', layer: 'technology', ref: 'partners.tax-live', state: 'removed' },
      { in: 'P1', layer: 'technology', ref: 'sandbox.tax-sandbox', state: 'removed' },
      { in: 'P1', layer: 'technology', ref: 'partners.commerce-live', state: 'new' },
      { in: 'P1', layer: 'technology', ref: 'sandbox.commerce-sandbox', state: 'new' }
    ]
  },
  {
    id: 'N16',
    case: 'Siblings',
    where: '`commerce.*` and `commerce-saas`',
    state: 'P5: `commerce-saas` removed, every `commerce.*` service new',
    why: 'Neither plateau is the other\'s past or future.',
    checks: [
      { in: 'P5', layer: 'application', ref: 'commerce-saas', state: 'removed' },
      { in: 'P5', layer: 'application', ref: 'commerce.gateway', state: 'new' },
      { in: 'P5', layer: 'application', ref: 'commerce.catalog', state: 'new' }
    ]
  },
  { id: 'N17', case: 'Old reference in a list', where: '`inhouse` `SET staging.vm applications`', state: 'variant V8', why: 'A list copied into a patch goes stale when the parent plateau changes.', checks: [] }
];

// The numbers of the document (section 10), kept apart from the description: the generator fails when the description stops giving them.
// Comparisons: [elements new, changed, removed, moved, split, merged, relationships new, changed, removed].
export const DOCUMENT = {
  sizes: {
    baseline: { application: 28, technology: 22, elements: 50, relationships: 28, files: 17, declared: 50, patches: 0, views: 109 },
    saas: { application: 21, technology: 21, elements: 42, relationships: 21, files: 4, declared: 3, patches: 19, views: 93 },
    inhouse: { application: 36, technology: 30, elements: 66, relationships: 35, files: 12, declared: 27, patches: 26, views: 147 },
    marketplace: { application: 48, technology: 34, elements: 82, relationships: 50, files: 17, declared: 26, patches: 23, views: 181 }
  },
  comparisons: {
    P1: [3, 5, 11, 0, 0, 0, 5, 1, 12],
    P2: [17, 5, 1, 7, 2, 1, 17, 1, 6],
    P3: [21, 12, 5, 5, 0, 0, 18, 1, 3],
    P4: [38, 3, 6, 11, 2, 1, 35, 1, 9],
    P5: [27, 4, 3, 0, 2, 1, 25, 0, 7],
    P6: [48, 3, 16, 4, 0, 0, 44, 0, 22]
  }
};

// The negative variants of section 11. `mutate` (V1 to V8) changes a fresh copy of the description so that the model can say what it finds; the others
// are only described. `mentions` are the words the message of a tool must contain (the final wording belongs to the implementation).
const withoutManifest = (pl, ref) => pl.manifests.splice(pl.manifests.findIndex((e) => e.ref === ref), 1)[0];

export const VARIANTS = [
  {
    id: 'V1',
    change: 'A typo in a `target`: `commerce.catalogue` instead of `commerce.catalog`, in the patch of `marketplace` that rewrites the description of the catalog.',
    expected: 'Error in `marketplace`: the patch on `commerce.catalogue` has no match (it names the rank of the patch).',
    class: 'error',
    mentions: ['marketplace', 'commerce.catalogue', 'no match'],
    runToday: '**Run** (case N44): one line from the command line and from the editor, ``plateau marketplace: patch 13 (SET target commerce.catalogue): selects nothing, there is no element commerce.catalogue in the application layer``.',
    mutate: (P) => {
      P.marketplace.patches.find((op) => op.operator === 'SET' && op.target === 'commerce.catalog').target = 'commerce.catalogue';
    }
  },
  {
    id: 'V2',
    change: '`marketplace` declares `commerce.cart` again.',
    expected: 'Error: `commerce.cart` declared twice (`inhouse` and `marketplace`).',
    class: 'error',
    mentions: ['commerce.cart', 'declared twice'],
    runToday: '**Run** (case N53): one line, ``the reference `commerce.cart` is declared in the plateau `marketplace` (`marketplace/application/commerce.cart-again.yaml`) and again in its ancestor `inhouse` (`inhouse/application/commerce.cart.yaml`)``, from both tools, whichever plateau is drawn. Its twin in one plateau is case N7 (``the reference ... is declared twice``).',
    mutate: (P) => {
      P.marketplace.declare(E('commerce.cart', 'container', 'Cart v2'), 'marketplace/application/commerce.cart.yaml');
    }
  },
  {
    id: 'V3',
    change: '`marketplace` gets `override: saas`.',
    expected: 'Error in `marketplace`: the parent of `prod.cloud.cdn` does not exist when its manifest is read.',
    class: 'error',
    mentions: ['marketplace', 'prod.cloud.cdn', 'parent'],
    runToday: '**Run** (case N45): one line, ``in the plateau `marketplace`, `prod.cloud.cdn` is declared under `prod.cloud`, which does not exist (3 more elements of the plateau are declared under a parent that does not exist)``, from both tools: the first element by reference is told and the others are counted. Cases N54 (two elements) and N46 (V4) are its smaller forms.',
    mutate: (P) => {
      P.marketplace.parent = 'saas';
    }
  },
  {
    id: 'V4',
    change: '`inhouse/application/commerce.cart.yaml` loses its `plateau: inhouse` header (the folder does not say the plateau: a manifest without the header is the `baseline`\'s).',
    expected: 'The file lands in `baseline`; error: the parent of `commerce.cart` does not exist. (A warning that the folder `inhouse` holds a manifest of `baseline` is W-7\'s, the editor\'s Files page.)',
    class: 'error and warning',
    mentions: ['baseline', 'commerce.cart', 'parent'],
    runToday: '**Run** (case N46): one line, ``in the plateau `baseline`, `commerce.cart` is declared under `commerce`, which does not exist``. The warning about the folder is not told by the command line.',
    mutate: (P) => {
      const e = withoutManifest(P.inhouse, 'commerce.cart');
      P.baseline.declare(e, 'inhouse/application/commerce.cart.yaml');
    }
  },
  {
    id: 'V5',
    change: 'A plateau typo, `plateau: inhous`, in the header of `inhouse/application/commerce.cart.yaml`.',
    expected: 'Same error in the implicit plateau `inhous`; with a warning that it exists only through one header.',
    class: 'error and warning',
    order: ['baseline', 'inhous'],
    mentions: ['inhous', 'commerce.cart', 'parent'],
    runToday: '**Run** (case N47): `diff --plateau inhous` gives two warnings (the plateau `inhous` exists only through one header; it is one letter from `inhouse`) and the error the document expects, ``in the plateau `inhous`, `commerce.cart` is declared under `commerce`, which does not exist``; `diff --plateau inhouse`, which lacks the cart, gives the same warnings and one line, ``in the plateau `inhouse`, `commerce.checkout` has a relationship towards `commerce.cart`, which does not exist (3 more elements of the plateau point at it)``.',
    mutate: (P) => {
      const e = withoutManifest(P.inhouse, 'commerce.cart');
      P.inhous = new Plateau('inhous', 'inhous', null, 'baseline', 'implicit');
      P.inhous.declare(e, 'inhouse/application/commerce.cart.yaml');
    }
  },
  {
    id: 'V6',
    change: 'A `SET` of the `id` of `platform.broker` to `platform.notifications`, an element the plateau declares (no operator renames or moves: a patch never changes an `id` or a `parent`).',
    expected: 'Error: a patch never changes an `id`.',
    class: 'error',
    mentions: ['marketplace', 'platform.broker', 'never changes'],
    runToday: '**Run** (case N48): one line, ``plateau marketplace: patch 1 (SET target platform.broker): `id` cannot be changed: a patch never changes an id or a parent``. (The earlier V6, a `MOVE` onto an existing reference, has no operator to run.)',
    mutate: (P) => {
      P.marketplace.op('SET', { target: 'platform.broker', field: 'id', value: 'platform.notifications' });
    }
  },
  {
    id: 'V7',
    change: '`REMOVE shop.cache` in `marketplace`.',
    expected: 'Error: no match (`inhouse` already removed it, `commerce.cart-store` replaces it). The stale-patch case.',
    class: 'error',
    mentions: ['marketplace', 'shop.cache', 'no match'],
    runToday: '**Run** (case N49): one line, ``plateau marketplace: patch 1 (REMOVE target shop.cache): selects nothing, there is no element shop.cache in the application layer``.',
    mutate: (P) => {
      P.marketplace.op('REMOVE', { target: 'shop.cache' });
    }
  },
  {
    id: 'V8',
    change: 'The `baseline` renames `shop.db` to `shop.database` (its own references follow).',
    expected:
      '`saas`: relationship `fulfilment.sync -> shop.db` matches nothing. `inhouse`: `staging.vm` lists a missing application (the copied list). `marketplace`: `REMOVE shop.db` matches nothing. ' +
      'The model stops a plateau at its first error: in `inhouse` the relationship `fulfilment.sync -> shop.db` fails before the copied list is looked at, and `marketplace` is then not resolved. An engine that collects every error would list all three.',
    class: 'error',
    mentions: ['saas', 'inhouse', 'shop.db'],
    runToday: '**Run** (case N50): the tools stop at the first error of the plateau asked for, one line each: ``plateau saas: patch 18 (SET target fulfilment.sync): fulfilment.sync has no relationship to shop.db with the label ...`` for `saas`, the same with ``plateau inhouse: patch 25`` for `inhouse` and for `marketplace`, which is not resolved.',
    mutate: (P) => {
      const rename = (r) => (r === 'shop.db' ? 'shop.database' : r);
      for (const e of P.baseline.manifests) {
        e.ref = rename(e.ref);
        for (const r of e.rels) r.dest = rename(r.dest);
        e.apps = e.apps.map(rename);
      }
    }
  },
  {
    id: 'V9',
    change: 'Two `SET` of the same field of the same target in one plateau.',
    expected: 'A warning; the last one wins.',
    class: 'warning',
    mentions: ['SET', 'last'],
    runToday: '**Run** (case N51): exit 0 and one warning, ``the plateau `marketplace` sets `description` of `commerce.catalog` in patches 1 and 14: the last one wins``, from both tools. Only the patches that name a `target` are compared.',
  },
  {
    id: 'V10',
    change: '`horizon` of a child plateau earlier than its parent\'s.',
    expected: 'A warning.',
    class: 'warning',
    mentions: ['horizon'],
    runToday: '**Run** (case N52): exit 0 and one warning, `` the horizon `2026-Q1` of the plateau `marketplace` is earlier than the horizon `2026-Q4` of the plateau it overrides, `inhouse` ``, from both tools. A horizon is a free label: two are compared only when both read as a period (`2026`, `2026-10`, `2026-10-18`, `2026-Q4`, `2026-H2`), and one is earlier when its whole period ends before the other begins (`2026` under `2026-Q4` is not; the forms are in case M61 of `plateau-model-cases.json`).',
  },
  {
    id: 'V11',
    change: 'Two plateaus with the same `override` and the same `id`.',
    expected: 'Error: plateau declared twice.',
    class: 'error',
    mentions: ['plateau', 'declared twice'],
    runToday: '**Run** (the cases of `plateau-model-cases.json`, read by a Java and a node test: a plateau declared by two manifests, `the plateau ... is declared twice`; and case N43 of `negative-cases.json`).',
  },
  {
    id: 'V12',
    change: 'Merge `inhouse` into `baseline` while `saas` hangs under `baseline`.',
    expected: 'Refused: `saas` no longer resolves (`patch REMOVE has no match for shop.app.catalog`). Allowed with `--drop saas`. Nothing is written when it is refused.',
    class: 'refusal',
    mentions: ['saas', 'shop.app.catalog'],
    runToday: 'Waits for `plateau merge` (#65).',
  },
  {
    id: 'V13',
    change: 'Merge `marketplace` into `saas`.',
    expected: 'Error: `saas` is not an ancestor of `marketplace`.',
    class: 'error',
    mentions: ['saas', 'marketplace', 'ancestor'],
    runToday: 'Waits for `plateau merge` (#65).',
  },
  {
    id: 'V14',
    change: 'Merge a plateau into itself, or `baseline` into anything.',
    expected: 'Error: nothing to merge.',
    class: 'error',
    mentions: ['nothing to merge'],
    runToday: 'Waits for `plateau merge` (#65).',
  }
];

// The merge scenarios of section 14 (the fold of a future plateau into the present).
export const MERGES = {
  M1: {
    merge: '`inhouse` into `baseline`',
    newPresent: '`baseline` resolves to 66 elements, with manifests only (the root has no patch).',
    survivors:
      '`marketplace` now hangs under `baseline`: its 26 manifests and 23 patches are unchanged, its state is unchanged (82 elements) and its comparison with the new `baseline` is exactly P3 (+21 ~12 -5, 5 moved). ' +
      '`saas` is refused: it targets `shop.app.catalog`, which the new baseline no longer has.',
    expected: '`--drop saas` is needed, or the merge stops before writing anything.',
    numbers: { presentElements: 66, survivorElements: 82, survivorComparison: 'P3' }
  },
  M2: {
    merge: '`marketplace` into `inhouse`',
    newPresent:
      '`inhouse` resolves to 82 elements and declares 53. Of the 23 patches of `marketplace`, 14 fold into manifests (they target elements `inhouse` or `marketplace` declares, or are the bulk edit); ' +
      '9 stay patches because they target elements of the baseline: `REMOVE shop.app`, `REMOVE shop.db`, `ADD` on `fulfilment.sync`, `REMOVE shop`, `ADD` on `customer`, `ADD` on the applications of `staging.vm` and the three `REMOVE` of virtual machines.',
    survivors: '`saas` is untouched and still resolves. The new `inhouse` against `baseline` is exactly P4 (+38 ~3 -6, 11 moved, 2 split, 1 merged). `discovery.search` is declared once and replaces `shop.app.search`, and `storefront` replaces `shop`.',
    expected: 'The only case where the composition of `replaces` is visible in the files.',
    declared: 53,
    foldedPatches: 14,
    keptPatches: 9,
    numbers: { presentElements: 82, comparison: 'P4' }
  },
  M3: {
    merge: '`marketplace` into `baseline` (two steps)',
    newPresent: '`baseline` resolves to 82 elements, manifests only.',
    survivors: '`saas` is refused or dropped. Nothing survives below.',
    expected: 'The chain has become one node.',
    numbers: { presentElements: 82 }
  }
};
