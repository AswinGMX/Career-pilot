"use client";

export function DynamicGreeting(): JSX.Element {
  const hour = new Date().getHours();
  let greeting = "Good Evening";
  let emoji = "👋";

  if (hour < 12) {
    greeting = "Good Morning";
    emoji = "☀️";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
    emoji = "👋";
  }

  return (
    <p className="landing-greeting-highlight">
      {greeting} {emoji}
    </p>
  );
}
