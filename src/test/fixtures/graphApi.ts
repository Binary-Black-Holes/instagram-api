export const mediaContainerCreated = {
  id: '17889455560051444',
};

export const mediaPublished = {
  id: '17920238422030506',
};

export const containerInProgress = {
  id: '17889455560051444',
  status_code: 'IN_PROGRESS',
};

export const containerFinished = {
  id: '17889455560051444',
  status_code: 'FINISHED',
};

export const publishingQuota = {
  data: [
    {
      quota_usage: 2,
      config: {
        quota_total: 50,
        quota_duration: 86400,
      },
    },
  ],
};

export const hashtagSearch = {
  data: [
    {
      id: '17841593698074073',
      name: 'coke',
    },
  ],
};

export const hashtagRecentMedia = {
  data: [
    {
      id: '17880997618081620',
      media_type: 'IMAGE',
      comments_count: 84,
      like_count: 177,
    },
  ],
  paging: {
    cursors: {
      after: 'after-cursor',
    },
  },
};

export const connectedAccounts = {
  data: [
    {
      id: '134895793791914',
      name: 'Example Page',
      access_token: 'PAGE_TOKEN',
      instagram_business_account: {
        id: '17841405309211844',
      },
    },
  ],
};

export const webhookSubscriptions = {
  data: [
    {
      id: '123456789',
      subscribed_fields: ['comments', 'messages'],
    },
  ],
};

export const graphRateLimitError = {
  error: {
    message: 'Application request limit reached',
    type: 'OAuthException',
    code: 4,
    fbtrace_id: 'trace-123',
  },
};

export const graphAuthError = {
  error: {
    message: 'Invalid OAuth access token.',
    type: 'OAuthException',
    code: 190,
    fbtrace_id: 'trace-456',
  },
};

export const webhookCommentEvent = {
  object: 'instagram',
  entry: [
    {
      id: '17841405309211844',
      time: 1_704_067_200,
      changes: [
        {
          field: 'comments',
          value: {
            id: '17873440459141029',
            text: 'Nice post!',
            media: { id: '17858843269216389' },
          },
        },
      ],
    },
  ],
};
