import { sha256 } from 'js-sha256';
import { type Coordinator, type Garage, Robot, type Order } from '.';
import { roboidentitiesClient } from '../services/Roboidentities/Web';

class Slot {
  constructor(
    token: string,
    shortAliases: string[],
    robotAttributes: Record<any, any>,
    onRobotUpdate: () => void,
  ) {
    this.token = token;

    this.hashId = sha256(sha256(this.token));
    this.nickname = null;
    void roboidentitiesClient.generateRoboname(this.hashId).then((nickname) => {
      this.nickname = nickname;
      onRobotUpdate();
    });
    void roboidentitiesClient.generateRobohash(this.hashId, 'small');
    void roboidentitiesClient.generateRobohash(this.hashId, 'large');

    this.robots = shortAliases.reduce((acc: Record<string, Robot>, shortAlias: string) => {
      acc[shortAlias] = new Robot(robotAttributes);
      return acc;
    }, {});
    this.order = null;

    this.activeShortAlias = null;
    this.lastShortAlias = null;
    this.copiedToken = false;
    onRobotUpdate();
  }

  token: string | null;
  hashId: string | null;
  nickname: string | null;
  robots: Record<string, Robot>;
  order: Order | null;
  activeShortAlias: string | null;
  lastShortAlias: string | null;
  copiedToken: boolean;

  setCopiedToken = (copied: boolean): void => {
    this.copiedToken = copied;
  };

  getRobot = (shortAlias?: string): Robot | null => {
    if (shortAlias) {
      return this.robots[shortAlias];
    } else if (this.activeShortAlias !== null && this.robots[this.activeShortAlias]) {
      return this.robots[this.activeShortAlias];
    } else if (this.lastShortAlias !== null && this.robots[this.lastShortAlias]) {
      return this.robots[this.lastShortAlias];
    } else if (Object.values(this.robots).length > 0) {
      return Object.values(this.robots)[0];
    }
    return null;
  };

  updateRobot = (shortAlias: string, attributes: Record<any, any>): Robot | null => {
    this.robots[shortAlias].update(attributes);

    if (attributes.lastOrderId) {
      this.lastShortAlias = shortAlias;
      if (this.activeShortAlias === shortAlias) {
        this.activeShortAlias = null;
      }
    }
    if (attributes.activeOrderId) {
      this.activeShortAlias = attributes.shortAlias;
    }

    return this.robots[shortAlias];
  };

  syncCoordinator: (coordinator: Coordinator, garage: Garage) => void = (coordinator, garage) => {
    const defaultRobot = this.getRobot();
    if (defaultRobot?.token) {
      this.robots[coordinator.shortAlias] = new Robot({
        token: defaultRobot.token,
        pubKey: defaultRobot.pubKey,
        encPrivKey: defaultRobot.encPrivKey,
      });
      void coordinator.fetchRobot(garage, defaultRobot.token);
    }
  };
}

export default Slot;
