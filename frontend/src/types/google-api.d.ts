declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: {
          apiKey: string;
          clientId: string;
          discoveryDocs: string[];
          scope: string;
        }) => Promise<void>;
        calendar: {
          events: {
            insert: (params: {
              calendarId: string;
              resource: any;
            }) => Promise<any>;
            update: (params: {
              calendarId: string;
              eventId: string;
              resource: any;
            }) => Promise<any>;
            delete: (params: {
              calendarId: string;
              eventId: string;
            }) => Promise<any>;
          };
          calendarList: {
            list: () => Promise<any>;
          };
        };
      };
      auth2: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
          };
          signIn: () => Promise<any>;
          signOut: () => Promise<any>;
        };
      };
    };
  }
}

export {};