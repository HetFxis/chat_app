#!/usr/bin/env python3
"""
Database migration helper script for the chat application.
This script provides easy commands to manage database migrations using Alembic.
"""

import subprocess
import sys
import os

def run_command(command):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False

def create_migration(message):
    """Create a new migration with autogenerate."""
    print(f"Creating migration: {message}")
    return run_command(f"alembic revision --autogenerate -m \"{message}\"")

def upgrade_database():
    """Upgrade database to latest migration."""
    print("Upgrading database to latest migration...")
    return run_command("alembic upgrade head")

def downgrade_database(revision="base"):
    """Downgrade database to a specific revision."""
    print(f"Downgrading database to: {revision}")
    return run_command(f"alembic downgrade {revision}")

def show_history():
    """Show migration history."""
    print("Migration history:")
    return run_command("alembic history")

def show_current():
    """Show current migration revision."""
    print("Current migration revision:")
    return run_command("alembic current")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python migrate.py create 'migration message'  - Create new migration")
        print("  python migrate.py upgrade                     - Upgrade to latest")
        print("  python migrate.py downgrade [revision]        - Downgrade to revision")
        print("  python migrate.py history                     - Show migration history")
        print("  python migrate.py current                     - Show current revision")
        return

    command = sys.argv[1].lower()
    
    if command == "create":
        if len(sys.argv) < 3:
            print("Please provide a migration message")
            return
        message = sys.argv[2]
        create_migration(message)
    
    elif command == "upgrade":
        upgrade_database()
    
    elif command == "downgrade":
        revision = sys.argv[2] if len(sys.argv) > 2 else "base"
        downgrade_database(revision)
    
    elif command == "history":
        show_history()
    
    elif command == "current":
        show_current()
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()
