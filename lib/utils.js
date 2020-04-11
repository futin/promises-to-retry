// node core modules

// 3rd party modules

// local modules

const responseByMode = {
  ALL: ({ allPromises }) => allPromises,
  ONLY_RESOLVED: ({ resolvedPromises }) => resolvedPromises,
  ONLY_WINNER_PROMISES: ({ winnerPromises }) => winnerPromises,
  ONLY_REJECTED: ({ rejectedPromises }) => rejectedPromises,
  ALL_SPLIT: ({ resolvedPromises, rejectedPromises }) => [resolvedPromises, rejectedPromises]
};

module.exports = {
  responseByMode
};
