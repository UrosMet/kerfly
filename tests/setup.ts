// jsdom does not implement scrolling; a no-op keeps the test output clean and lets tests spy on it
if (typeof window !== 'undefined') window.scrollTo = () => {};
