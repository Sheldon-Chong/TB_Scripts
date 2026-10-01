declare var Action: {
  /** Perform the requested action (slot - menu item, toolbar item,...) */
  perform(slot: string): void;

  /** Perform the requested action (slot - menu item, toolbar item,...) */
  perform(slot: string, responder: string): void;

  /** Execute an action using the action manager on the given responder with parameters. */
  perform(slot: string, responder: string, parameters: any): void;

  /** Execute an action using the action manager on all responder instances. */
  performForEach(slot: string, responder: string): void;

  /** Validate the requested action (slot - menu item, toolbar item,...) */
  validate(slot: string): any;

  /** Validate the requested action (slot - menu item, toolbar item,...) */
  validate(slot: string, responder: string): any;

  /** Retrieve the list of responder names. */
  getResponderList(): string[];

  /** Retrieve the list of actions for a given responder. */
  getActionList(responder: string): string[];
};
