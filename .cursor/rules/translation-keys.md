---
description: Translation key requirements for UI text
globs: ["src/**/*.jsx", "src/**/*.js"]
alwaysApply: true
---

- All user-visible text in UI components must use translation keys
- Always add corresponding entries to src/messages/en.json for new translation keys
- Use consistent naming patterns: common.{category}.{element}, {feature}.{subfeature}.{element}
- Include fallback text with the || operator in case translation is missing
- Document all new translation keys added when completing tasks
- Ensure you add a relevant translation key to all files in /src/messages/

@translation-key-example.jsx
```jsx
// Component with properly localized text
const ExampleComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h2>{t("example.title") || "Example Title"}</h2>
      <p>{t("example.description") || "This is an example description."}</p>
      <Button>{t("common.action.save") || "Save"}</Button>
    </div>
  );
};

// Corresponding entries in src/messages/en.json:
// {
//   "example.title": "Example Title",
//   "example.description": "This is an example description.",
//   "common.action.save": "Save"
// }
``` 