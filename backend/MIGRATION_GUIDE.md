# Database Migration Guide

This guide explains how to use Alembic for database migrations in your chat application.

## Quick Start

### Using the Migration Helper Script

```bash
# Create a new migration after changing models
python migrate.py create "Add new column to users table"

# Apply all pending migrations
python migrate.py upgrade

# Show current migration status
python migrate.py current

# Show migration history
python migrate.py history

# Rollback to previous migration
python migrate.py downgrade -1
```

### Direct Alembic Commands

```bash
# Create a new migration
alembic revision --autogenerate -m "Migration message"

# Apply migrations
alembic upgrade head

# Check current revision
alembic current

# Show history
alembic history

# Rollback
alembic downgrade -1
```

## Workflow for Schema Changes

### 1. Modify Your Models
Edit `models.py` to add/remove/modify columns or tables.

### 2. Generate Migration
```bash
python migrate.py create "Describe your changes"
```

### 3. Review the Migration
Check the generated file in `alembic/versions/` to ensure it's correct.

### 4. Apply Migration
```bash
python migrate.py upgrade
```

## Common Scenarios

### Adding a New Column
1. Add column to your model in `models.py`
2. Generate migration: `python migrate.py create "Add email_verified column"`
3. Apply: `python migrate.py upgrade`

### Renaming a Column
1. Modify the column name in `models.py`
2. Generate migration: `python migrate.py create "Rename user_name to username"`
3. **Important**: Edit the migration file to use `op.alter_column()` instead of drop/add
4. Apply: `python migrate.py upgrade`

### Adding a New Table
1. Create new model class in `models.py`
2. Generate migration: `python migrate.py create "Add notifications table"`
3. Apply: `python migrate.py upgrade`

## Important Notes

- **Always backup your database** before running migrations in production
- **Review generated migrations** before applying them
- **Test migrations** on a copy of your data first
- The initial migration `0bb9fc6eaee6_initial_migration.py` captures your current schema

## Current Database Schema

Your chat application has these tables:
- `users` - User accounts and authentication
- `messages` - Chat messages with group support
- `push_subscriptions` - Web push notification subscriptions
- `group_chats` - Group chat rooms
- `group_membership` - Many-to-many relationship between users and groups

## Troubleshooting

### Migration Conflicts
If you get conflicts, you may need to:
```bash
# Check current state
python migrate.py current

# Manually resolve conflicts in migration files
# Then apply
python migrate.py upgrade
```

### Reset Database (Development Only)
```bash
# Delete database file
rm chat.db

# Apply all migrations from scratch
python migrate.py upgrade
```

### Production Deployment
1. Always test migrations on staging first
2. Backup production database
3. Run migrations during maintenance window
4. Monitor application after deployment
