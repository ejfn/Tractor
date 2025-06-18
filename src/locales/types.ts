// Auto-generated types for translation keys
// This ensures type safety for all translation calls

export interface CommonTranslations {
  appTitle: string;
  buttons: {
    playCards: string;
    playCards_plural: string;
    selectMore: string;
    selectMore_plural: string;
  };
  loading: string;
  round: string;
  trump: string;
  teams: {
    A: string;
    B: string;
  };
  players: {
    human: string;
    bot1: string;
    bot2: string;
    bot3: string;
  };
  suits: {
    hearts: string;
    diamonds: string;
    clubs: string;
    spades: string;
  };
}

export interface GameTranslations {
  status: {
    attacking: string;
    defending: string;
    rank: string;
    points: string;
    pointsCount: string;
  };
  phases: {
    dealing: string;
    declaring: string;
    kittySwap: string;
    playing: string;
    scoring: string;
    roundEnd: string;
    gameOver: string;
  };
  tricks: {
    youWin: string;
    playerWins: string;
    pointsAwarded: string;
  };
  actions: {
    selectCardsToSwap: string;
    swapKittyCards: string;
    dealingProgress: string;
    tapToPause: string;
  };
}

export interface TrumpDeclarationTranslations {
  actions: {
    finalDeclaration: string;
    finalDeclarationInfo: string;
    trumpDeclaration: string;
  };
  declarations: {
    single: string;
    pair: string;
    smallJokers: string;
    bigJokers: string;
  };
  messages: {
    currentDeclaration: string;
    trumpDeclarationLabel: string;
    noDeclarations: string;
    noValidDeclarations: string;
    needMatchingCards: string;
    playWillBegin: string;
    startPlaying: string;
    continue: string;
  };
}

export interface ModalsTranslations {
  newGame: {
    title: string;
    message: string;
    submessage: string;
    confirm: string;
    cancel: string;
  };
  roundComplete: {
    title: string;
    nextRound: string;
  };
  roundResult: {
    attackingWonDefend: string;
    attackingWonAdvance: string;
    attackingWonAce: string;
    defendingWonGame: string;
    defendingWonAdvance: string;
    defendingWonAce: string;
    heldToPoints: string;
    defendedWithPoints: string;
  };
  gameOver: {
    title: string;
    message: string;
    congratulations: string;
    teamWins: string;
    youWin: string;
    playerWins: string;
    newGame: string;
  };
}

// Union type for all translation keys
export type TranslationKeys = {
  common: CommonTranslations;
  game: GameTranslations;
  trumpDeclaration: TrumpDeclarationTranslations;
  modals: ModalsTranslations;
};

// Helper types for accessing nested keys
export type CommonKeys = keyof CommonTranslations;
export type GameKeys = keyof GameTranslations;
export type TrumpDeclarationKeys = keyof TrumpDeclarationTranslations;
export type ModalsKeys = keyof ModalsTranslations;

// Deep key access types
export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${DeepKeys<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type CommonTranslationKey = DeepKeys<CommonTranslations>;
export type GameTranslationKey = DeepKeys<GameTranslations>;
export type TrumpDeclarationTranslationKey =
  DeepKeys<TrumpDeclarationTranslations>;
export type ModalsTranslationKey = DeepKeys<ModalsTranslations>;
