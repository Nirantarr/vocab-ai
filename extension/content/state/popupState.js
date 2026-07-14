window.VocabAIExtension = window.VocabAIExtension || {};

(function initializePopupState() {
  let currentState = null;

  function getState() {
    return currentState;
  }

  function setState(nextState) {
    currentState = nextState ? { ...nextState } : null;
    return currentState;
  }

  function updateState(partialState = {}) {
    currentState = {
      ...(currentState || {}),
      ...partialState
    };

    return currentState;
  }

  function resetState() {
    currentState = null;
  }

  window.VocabAIExtension.popupState = {
    getState,
    resetState,
    setState,
    updateState
  };
})();
