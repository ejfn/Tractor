import { PlayerId, TeamId, Suit } from "../../src/types";
import {
  getTeamDisplayName,
  getPlayerDisplayName,
  getSuitDisplayName,
} from "../../src/utils/translationHelpers";

describe("translationHelpers", () => {
  let mockT: jest.Mock;

  beforeEach(() => {
    // Return a mock string that includes the key so we can assert properly
    mockT = jest.fn((key: string) => `translated_${key}`);
  });

  describe("getTeamDisplayName", () => {
    it("should translate Team A correctly", () => {
      const result = getTeamDisplayName(mockT, TeamId.A);
      expect(mockT).toHaveBeenCalledWith("teams.A", { ns: "common" });
      expect(result).toBe("translated_teams.A");
    });

    it("should translate Team B correctly", () => {
      const result = getTeamDisplayName(mockT, TeamId.B);
      expect(mockT).toHaveBeenCalledWith("teams.B", { ns: "common" });
      expect(result).toBe("translated_teams.B");
    });
  });

  describe("getPlayerDisplayName", () => {
    it("should translate Human player correctly", () => {
      const result = getPlayerDisplayName(mockT, PlayerId.Human);
      expect(mockT).toHaveBeenCalledWith("players.human", { ns: "common" });
      expect(result).toBe("translated_players.human");
    });

    it("should translate Bot1 player correctly", () => {
      const result = getPlayerDisplayName(mockT, PlayerId.Bot1);
      expect(mockT).toHaveBeenCalledWith("players.bot1", { ns: "common" });
      expect(result).toBe("translated_players.bot1");
    });
  });

  describe("getSuitDisplayName", () => {
    it("should translate Spades correctly", () => {
      const result = getSuitDisplayName(mockT, Suit.Spades);
      expect(mockT).toHaveBeenCalledWith("suits.spades", { ns: "common" });
      expect(result).toBe("translated_suits.spades");
    });

    it("should translate Hearts correctly", () => {
      const result = getSuitDisplayName(mockT, Suit.Hearts);
      expect(mockT).toHaveBeenCalledWith("suits.hearts", { ns: "common" });
      expect(result).toBe("translated_suits.hearts");
    });

    it("should translate none correctly", () => {
      const result = getSuitDisplayName(mockT, Suit.None);
      expect(mockT).toHaveBeenCalledWith("suits.none", { ns: "common" });
      expect(result).toBe("translated_suits.none");
    });
  });
});
