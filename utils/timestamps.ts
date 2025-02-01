type Timestamps = {
    [key: string]: {
      birthtime: string;
      mtime: string;
    };
  };

export const readTimestamps = async (): Promise<Timestamps> => {
    const jsonString = await Deno.readTextFile("./timestamps.json"); // Replace with the correct path
    return JSON.parse(jsonString);
};