CREATE TABLE IF NOT EXISTS recipe_categories (
  slug text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipes (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category_id text NOT NULL REFERENCES recipe_categories(slug),
  settings jsonb NOT NULL,
  document jsonb NOT NULL,
  camera_model text NOT NULL DEFAULT 'DC-G9' CHECK (camera_model = 'DC-G9'),
  firmware_minimum text NOT NULL,
  validation_status text NOT NULL CHECK (validation_status IN ('experimental', 'community-tested', 'camera-verified')),
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  archived_at timestamptz,
  created_by text REFERENCES "user"("id") ON DELETE SET NULL,
  updated_by text REFERENCES "user"("id") ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipes_document_slug_check CHECK (document->>'slug' = slug),
  CONSTRAINT recipes_document_camera_check CHECK (document->'settings'->>'cameraModel' = 'DC-G9'),
  CONSTRAINT recipes_verified_evidence_check CHECK (
    validation_status = 'experimental'
    OR (document ? 'testEvidence' AND document->'testEvidence'->>'sameScenePair' = 'true')
  )
);
CREATE INDEX IF NOT EXISTS recipes_public_order_idx ON recipes (published, featured DESC, sort_order, slug) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_category_idx ON recipes (category_id, published) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_updated_at_idx ON recipes (updated_at DESC);

CREATE TABLE IF NOT EXISTS recipe_tags (
  slug text PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipe_tag_relations (
  recipe_slug text NOT NULL REFERENCES recipes(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  tag_slug text NOT NULL REFERENCES recipe_tags(slug) ON DELETE CASCADE,
  PRIMARY KEY (recipe_slug, tag_slug)
);
CREATE INDEX IF NOT EXISTS recipe_tag_relations_tag_idx ON recipe_tag_relations (tag_slug, recipe_slug);

CREATE TABLE IF NOT EXISTS recipe_images (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_slug text NOT NULL REFERENCES recipes(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  storage_path text NOT NULL UNIQUE,
  image_url text NOT NULL,
  image_type text NOT NULL CHECK (image_type IN ('hero', 'camera-jpeg', 'control', 'experimental-result')),
  authenticity_type text NOT NULL CHECK (authenticity_type IN ('illustrative', 'g9-capture', 'controlled-pair')),
  photographer text NOT NULL,
  licence text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text REFERENCES "user"("id") ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipe_images_recipe_idx ON recipe_images (recipe_slug, image_type, created_at DESC);

CREATE TABLE IF NOT EXISTS recipe_tests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_slug text NOT NULL REFERENCES recipes(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  revision integer NOT NULL,
  firmware_version text NOT NULL,
  test_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_status text NOT NULL CHECK (verification_status IN ('community-tested', 'camera-verified', 'rejected')),
  tested_by text NOT NULL,
  tested_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES "user"("id") ON DELETE SET NULL,
  UNIQUE (recipe_slug, revision, tested_at)
);
CREATE INDEX IF NOT EXISTS recipe_tests_recipe_idx ON recipe_tests (recipe_slug, tested_at DESC);

CREATE TABLE IF NOT EXISTS recipe_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_slug text NOT NULL,
  version integer NOT NULL,
  settings_snapshot jsonb NOT NULL,
  document_snapshot jsonb NOT NULL,
  change_notes text NOT NULL DEFAULT '',
  changed_by text REFERENCES "user"("id") ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_slug, version)
);
CREATE INDEX IF NOT EXISTS recipe_revisions_recipe_idx ON recipe_revisions (recipe_slug, version DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by text REFERENCES "user"("id") ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Server-side admin writes use the database owner connection after Better Auth checks the session
-- and admin_users allowlist. Roles without that server credential can only read published records.
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_categories_public_read ON recipe_categories FOR SELECT USING (true);
CREATE POLICY recipes_public_read ON recipes FOR SELECT USING (published = true AND archived_at IS NULL);
CREATE POLICY recipe_tags_public_read ON recipe_tags FOR SELECT USING (true);
CREATE POLICY recipe_tag_relations_public_read ON recipe_tag_relations FOR SELECT USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.slug = recipe_tag_relations.recipe_slug AND recipes.published = true AND recipes.archived_at IS NULL)
);
CREATE POLICY recipe_images_public_read ON recipe_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.slug = recipe_images.recipe_slug AND recipes.published = true AND recipes.archived_at IS NULL)
);
CREATE POLICY recipe_tests_public_read ON recipe_tests FOR SELECT USING (
  verification_status IN ('community-tested', 'camera-verified')
  AND EXISTS (SELECT 1 FROM recipes WHERE recipes.slug = recipe_tests.recipe_slug AND recipes.published = true AND recipes.archived_at IS NULL)
);

-- These grants are still constrained by the SELECT policies above. A separate non-owner
-- DATABASE_READONLY_URL can use them; private revision/settings tables receive no public grant.
GRANT SELECT ON recipe_categories, recipes, recipe_tags, recipe_tag_relations, recipe_images, recipe_tests TO PUBLIC;
