export type FieldType = "email-only" | "email-name";

export type SuccessBehavior = { type: "redirect"; url: string } | { type: "message"; message: string };

export interface FormConfig {
  websiteId: string;
  fields: FieldType;
  successBehavior: SuccessBehavior;
  errorMessage: string;
}

export function generateFormPreview(fields: FieldType): string {
  const emailField = `<input type="email" name="email" placeholder="your@email.com" required />`;

  if (fields === "email-only") {
    return `<form>
  ${emailField}
  <button type="submit">Subscribe</button>
</form>`;
  }

  return `<form>
  ${emailField}
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>`;
}

export function generateFormCode(config: FormConfig): string {
  const formPreview = generateFormPreview(config.fields);
  const formId = "subscriber-form";
  const scriptUrl = `https://heybackend.com/api/${config.websiteId}/sdk.js`;

  const formWithId = formPreview.replace("<form>", `<form id="${formId}"`);
  let successCallback = "";
  let successMessage = "";

  if (config.successBehavior.type === "redirect") {
    successCallback = `window.location.href = '${config.successBehavior.url}';`;
  } else {
    successMessage = `<div id="success-message" style="display:none;">${config.successBehavior.message}</div>`;
    successCallback = `
    document.getElementById('${formId}').style.display = 'none';
    document.getElementById('success-message').style.display = 'block';`;
  }

  const code = `${formWithId}
${successMessage}

<script src="${scriptUrl}"></script>
<script>
  __HB.bindSubscriberForm('#${formId}', {
    onSuccess: () => {
      ${successCallback}
    },
    onError: (err) => {
      alert('${config.errorMessage}');
    }
  });
</script>`;

  return code;
}
