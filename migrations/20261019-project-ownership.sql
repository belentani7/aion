-- REVIEW AND APPLY ONCE to MySQL before enabling this candidate in production.
-- This migration has NOT been applied to a live database.
-- Never automatically assign historical projects to a guessed owner.
ALTER TABLE aion_projects ADD COLUMN ownerId INT NULL;
CREATE INDEX aion_projects_owner_idx ON aion_projects (ownerId, id);
