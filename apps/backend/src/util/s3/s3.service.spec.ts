import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...original,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

describe('S3Service', () => {
  let service: S3Service;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get<S3Service>(S3Service);
    // Access the mocked send method on the private client
    mockSend = (service as unknown as { client: { send: jest.Mock } }).client
      .send;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResume', () => {
    it('returns a readable stream for the given key', async () => {
      const fakeStream = Readable.from(['pdf-content']);
      mockSend.mockResolvedValue({ Body: fakeStream });

      const result = await service.getResume('resumes/abc-resume.pdf');

      expect(result).toBe(fakeStream);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('rethrows error when S3 fails', async () => {
      const error = new Error('S3 access denied');
      mockSend.mockRejectedValue(error);

      await expect(service.getResume('resumes/missing.pdf')).rejects.toThrow(
        'S3 access denied',
      );
    });
  });
});
