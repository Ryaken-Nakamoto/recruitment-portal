import { SesService } from './ses.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe('SesService', () => {
  let service: SesService;

  beforeEach(() => {
    mockSend.mockReset();
    delete process.env.NODE_ENV;
    service = new SesService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls SESv2Client.send with correct payload', async () => {
    mockSend.mockResolvedValue({});

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toMatchObject({
      FromEmailAddress: 'team@c4c.com',
      Destination: { ToAddresses: ['alice@example.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Hello Alice' },
          Body: { Text: { Data: 'Welcome!' } },
        },
      },
    });
  });

  it('throws when SESv2Client.send rejects', async () => {
    mockSend.mockRejectedValue(new Error('SES failure'));

    await expect(
      service.sendEmail({
        to: 'alice@example.com',
        from: 'team@c4c.com',
        subject: 'Hello',
        body: 'Body',
      }),
    ).rejects.toThrow('SES failure');
  });

  it('skips sending when NODE_ENV is local', async () => {
    process.env.NODE_ENV = 'local';

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
