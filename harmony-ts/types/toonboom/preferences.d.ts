declare interface PreferencesAPI {
  /**
   * Gets the color from the given preference name.
   * @param name The preference name.
   * @param defaultValue The default value of the preference.
   */
  getColor(name: string, defaultValue: ColorRGBA): ColorRGBA;

  /**
   * Sets the color for the given preference name.
   * @param name The preference name.
   * @param color The color to set the preference to.
   */
  setColor(name: string, color: ColorRGBA): void;

  /**
   * Gets the double value from the given preference name.
   * @param name The preference name.
   * @param defaultValue The default value of the preference.
   */
  getDouble(name: string, defaultValue: number): number;

  /**
   * Sets the double value for the given preference name.
   * @param name The preference name.
   * @param value The double to set the preference to.
   */
  setDouble(name: string, value: number): void;

  /**
   * Gets the integer value from the given preference name.
   * @param name The name of the preference.
   * @param defaultValue The default value of the preference.
   */
  getInt(name: string, defaultValue: number): number;

  /**
   * Sets the integer value for the given preference name.
   * @param name The preference name.
   * @param value The integer to set the preference to.
   */
  setInt(name: string, value: number): void;

  /**
   * Gets the boolean value from the given preference name.
   * @param name The name of the preference.
   * @param defaultValue The default value of the preference.
   */
  getBool(name: string, defaultValue: boolean): boolean;

  /**
   * Sets the boolean value for the given preference name.
   * @param name The name of the preference.
   * @param value The boolean to set the preference to.
   */
  setBool(name: string, value: boolean): void;

  /**
   * Gets the string value from the given preference name.
   * @param name The name of the preference.
   * @param defaultValue The default value of the preference.
   */
  getString(name: string, defaultValue: string): string;

  /**
   * Sets the string value for the given preference name.
   * @param name The name of the preference.
   * @param value The string to set the preference to.
   */
  setString(name: string, value: string): void;
}

/**
 * The preferences JavaScript global object.
 * Used to set or retrieve user preferences saved in local user data.
 */
declare const preferences: PreferencesAPI;
