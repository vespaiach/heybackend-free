# HeyBackend SDK Usage Guide

## Quick Start

Load the SDK in your HTML:

```html
<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
```

The SDK exposes a global `__HB` object with the following APIs:

## API Reference

### subscribe(data)

Directly subscribe a user without a form.

**Parameters:**
- `email` (string, required) — User's email address
- `firstName` (string, optional) — User's first name
- `lastName` (string, optional) — User's last name

**Returns:** Promise<{status: number}>

**Example:**
```javascript
__HB.subscribe({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
}).then(result => {
  console.log('Subscribed!', result);
}).catch(err => {
  console.error('Failed:', err.message);
});
```

### bindSubscriberForm(selector, callbacks)

Automatically handle form submission for a subscriber form.

**Parameters:**
- `selector` (string | HTMLFormElement) — CSS selector or form element reference
- `callbacks` (object) — Callback handlers
  - `onSuccess` (function) — Called when subscription succeeds
  - `onError` (function) — Called when subscription fails (receives Error object)

**Returns:** () => void — Cleanup function to remove listeners

**Form Field Names:**
- `email` — Required. Input field with name="email"
- `firstName` — Optional. Input field with name="firstName"
- `lastName` — Optional. Input field with name="lastName"

**Example:**
```html
<form id="subscriber-form">
  <input type="email" name="email" required />
  <input type="text" name="firstName" />
  <input type="text" name="lastName" />
  <button type="submit">Subscribe</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: (result) => {
      alert('Welcome!');
    },
    onError: (err) => {
      alert('Error: ' + err.message);
    }
  });
</script>
```

### bindContactForm(selector, callbacks)

Handle contact form submissions (separate from subscriber forms).

**Parameters:**
- `selector` (string | HTMLFormElement) — CSS selector or form element reference
- `callbacks` (object) — Callback handlers

**Form Field Names:**
- `name` (required, max 256 chars)
- `email` (required, valid email format, max 320 chars)
- `message` (required, max 5000 chars)
- `company` (optional, max 256 chars)
- `phone` (optional, max 50 chars)

**Example:**
```html
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindContactForm('#contact-form', {
    onSuccess: () => console.log('Message sent'),
    onError: (err) => console.error(err.message)
  });
</script>
```

## Validation

### Client-Side Validation

The SDK validates before sending:
- **email**: Must be a valid email format (validated via HTML5 input validation)
- **firstName, lastName**: Trimmed, optional
- **All fields**: Empty strings are treated as missing (trimmed)

### Server-Side Validation

The API endpoint validates again. Client-side validation is a UX feature only.

## Error Handling

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "Email is required" | Form email field is empty | Ensure input name="email" exists and has value |
| "Form not found for selector X" | Selector doesn't match any form | Check CSS selector or pass HTMLFormElement directly |
| Network error | Connection failed | Will auto-retry once; handle in onError callback |
| HTTP 429 | Rate limited | Too many requests from same IP; wait before retrying |

**Example error handling:**
```javascript
__HB.bindSubscriberForm('#form', {
  onError: (err) => {
    if (err.message.includes('Email')) {
      document.getElementById('email-error').textContent = err.message;
    } else {
      console.error('Unexpected error:', err.message);
    }
  }
});
```

## Integration Examples

### HTML Form with Redirect on Success

```html
<form id="signup">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#signup', {
    onSuccess: () => {
      window.location.href = '/welcome';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>
```

### HTML Form with Inline Message

```html
<form id="signup">
  <input type="email" name="email" required />
  <button type="submit">Subscribe</button>
</form>
<div id="success-msg" style="display:none; color: green;">
  Thanks for subscribing!
</div>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#signup', {
    onSuccess: () => {
      document.getElementById('signup').style.display = 'none';
      document.getElementById('success-msg').style.display = 'block';
    },
    onError: (err) => {
      alert('Error: ' + err.message);
    }
  });
</script>
```

## Troubleshooting

### "Form not found for selector..."
- Check the CSS selector is correct
- Ensure the form exists in the DOM when the script runs
- Try passing the form element directly: `__HB.bindSubscriberForm(formElement, ...)`

### Form submits but nothing happens
- Check browser console for errors (F12 → Console)
- Verify the script tag URL is correct and websiteId matches
- Ensure form has an input with name="email"

### CORS errors when loading SDK
- SDK is loaded from the same origin (app.heybackend.com) — CORS is not an issue
- Check that you're using the correct script URL format

## Support

For issues, check your browser console (F12) for error messages. Errors are sent to `onError` callback.
