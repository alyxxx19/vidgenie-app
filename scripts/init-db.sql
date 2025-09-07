-- ==================================================
-- Script d'initialisation de la base de données
-- PHASE 5.2 - Configuration PostgreSQL Docker
-- ==================================================

-- Créer la base de données principale si elle n'existe pas
SELECT 'CREATE DATABASE vidgenie_dev' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vidgenie_dev');

-- Créer la base de test
CREATE DATABASE IF NOT EXISTS vidgenie_test;

-- Extensions utiles pour PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour recherche full-text
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Index optimisés

-- Configuration pour optimiser les performances
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Paramètres de performance pour développement
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';

-- Recharger la configuration
SELECT pg_reload_conf();