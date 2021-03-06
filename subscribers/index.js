module.exports = {
  sendOverSocketIO: (store, broadcastState) => {
    store.subscribe(() => {
      // get it from the store
      const state = store.getState();

      // omit wordy fields
      // state.questions =
      //   state.questions && state.questions.length > 0
      //     ? [state.questions.length]
      //     : null;

      // log it on console
      console.log("New state:", JSON.stringify(state.round, null, 2));

      // send it over the websocket
      broadcastState(state);
    });
  },
  persistToDB: (store, { Game }) => {
    store.subscribe(() => {
      const game = store.getState();
      const gameId = "nu-review"; // TODO change for each cohort, game identity there can be
      Game.update({ gameId: gameId }, game, { upsert: true })
        .then(({ nModified }) => {})
        .then(() => console.log(`Saved state to Games(${gameId})`))
        .catch(e => console.error("No saved state:\n", e));
    });
  }
};
