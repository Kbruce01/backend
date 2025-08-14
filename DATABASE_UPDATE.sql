-- Add password reset columns to users table
ALTER TABLE users 
ADD COLUMN password_reset_token VARCHAR(255) NULL,
ADD COLUMN password_reset_expires TIMESTAMP NULL;

-- If you want to remove the email verification columns (since we're not using them):
-- ALTER TABLE users 
-- DROP COLUMN email_verified,
-- DROP COLUMN email_verification_token;
