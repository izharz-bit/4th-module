# TaskFlow — JavaScript Logic & State Management

TaskFlow is a fully client-side To-Do List application built with vanilla JavaScript.

## Implemented Features

- Create tasks
- Read/render tasks dynamically from JavaScript state
- Update tasks by editing title
- Update tasks by toggling completed/active status
- Delete individual tasks
- Clear all completed tasks
- Filter tasks by:
  - All
  - Active
  - Completed
- Persist tasks automatically with `window.localStorage`
- Retain data after browser reload
- Create DOM elements dynamically using a `<template>`
- Use delegated event listeners on the task list
- Use a central state object
- Accessible labels, focus states, and live status messages
- Light/dark theme toggle with localStorage persistence
- Fully responsive design

## File Structure

```txt
index.html
assets/
  css/
    styles.css
  js/
    app.js
README.md
```

## Upload Instructions

Upload the files exactly with this structure:

```txt
index.html
assets/css/styles.css
assets/js/app.js
README.md
```

The paths must stay exactly the same because `index.html` loads:

```html
<link rel="stylesheet" href="assets/css/styles.css">
<script src="assets/js/app.js" defer></script>
```

## JavaScript Concepts Demonstrated

- DOM selection
- Form submit handling
- Event delegation
- State management
- Array methods: `map`, `filter`, `some`, `unshift`
- Local storage read/write
- JSON serialization/deserialization
- Dynamic DOM rendering
- Template cloning
- Accessibility attributes
