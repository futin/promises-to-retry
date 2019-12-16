// node core modules

// 3rd party modules

// local modules

const responseByMode = {
  ONLY_RESOLVED: ({ resolvedPromises }) => resolvedPromises,
  ONLY_REJECTED: ({ rejectedPromises }) => rejectedPromises,
  ALL_COMBINED: ({ rejectedPromises, resolvedPromises }) => [...resolvedPromises, ...rejectedPromises],
  ALL_SPLIT: ({ rejectedPromises, resolvedPromises }) => [resolvedPromises, rejectedPromises]
};

module.exports = {
  responseByMode
};
