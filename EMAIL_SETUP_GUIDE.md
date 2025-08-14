# Email Setup Guide for Task Manager

## 🎉 **New Features Added:**

✅ **Email Verification** - Users must verify their email before logging in
✅ **Password Reset** - Users can reset their password via email
✅ **Resend Verification** - Users can request new verification emails

## 📧 **Email Configuration Setup:**

### Step 1: Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Task Manager"
   - Copy the generated 16-character password

### Step 2: Update Environment Variables

Add these to your `backend/.env` file:

```env
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
FRONTEND_URL=http://localhost:3000
```

### Step 3: Update Database Schema

Run this SQL to add the new columns:

```sql
-- Add email verification and password reset columns
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verification_token VARCHAR(255),
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP;
```

## 🔧 **How It Works:**

### Email Verification Flow:
1. User registers → Verification email sent
2. User clicks link → Email verified
3. User can now login

### Password Reset Flow:
1. User clicks "Forgot Password"
2. Enters email → Reset link sent
3. User clicks link → Sets new password
4. User can login with new password

## 📱 **New Frontend Pages:**

- `/verify-email` - Email verification page
- `/reset-password` - Password reset page
- Enhanced login with verification checks

## 🛡️ **Security Features:**

- ✅ Email verification required for login
- ✅ Secure token generation
- ✅ Token expiration (24 hours for verification, 1 hour for reset)
- ✅ Password confirmation validation
- ✅ Rate limiting protection

## 🧪 **Testing the Features:**

### Test Email Verification:
1. Register a new account
2. Check your email for verification link
3. Click the link to verify
4. Try logging in

### Test Password Reset:
1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Check email for reset link
5. Set new password

## ⚠️ **Important Notes:**

1. **Gmail App Password Required** - Regular Gmail password won't work
2. **Frontend URL** - Must match your React app URL
3. **Database Update** - Run the ALTER TABLE command
4. **Environment Variables** - Add all new variables to .env

## 🚨 **Troubleshooting:**

### Email Not Sending:
- Check Gmail app password is correct
- Verify 2FA is enabled
- Check EMAIL_USER and EMAIL_PASS in .env

### Verification Not Working:
- Check FRONTEND_URL in .env
- Verify database columns were added
- Check browser console for errors

### Password Reset Issues:
- Ensure reset token hasn't expired
- Check email configuration
- Verify database schema

## 📊 **Production Considerations:**

For production deployment:
- Use a professional email service (SendGrid, Mailgun)
- Set up proper domain email
- Configure SPF/DKIM records
- Use environment-specific URLs

## 🎯 **Next Steps:**

1. Set up Gmail app password
2. Update your .env file
3. Run database migration
4. Test the features
5. Deploy to production

Your app now has professional-grade email functionality! 🚀
