import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { contentService } from '../services/content.service';
import { CollectionService } from '../services/collection.service';
import { FastifyReply } from 'fastify';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import * as splitGraphemes from 'split-graphemes';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('content')
@Controller('content')
export class contentController {
  constructor(
    private readonly contentService: contentService,
    private readonly collectionService: CollectionService,
    private readonly httpService: HttpService,
  ) { }

  @ApiBody({
    description: 'Request body for storing the data into the content',
    schema: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', example: '3f0192af-0720-4248-b4d4-d99a9f731d4f' },
        name: { type: 'string', example: 'tn gr2 eng t1 ch2d' },
        contentType: { type: 'string', example: 'Sentence' },
        contentSourceData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              language: { type: 'string', example: 'en' },
              audioUrl: { type: 'string', example: '' },
              text: { type: 'string', example: 'Blue bird, blue bird, what do you see?' },
            },
          },
        },
        status: { type: 'string', example: 'live' },
        publisher: { type: 'string', example: 'ekstep' },
        language: { type: 'string', example: 'en' },
        contentIndex: { type: 'number', example: 1 },
        tags: { type: 'array', items: { type: 'string' }, example: [] },
        imagePath: { type: 'string', example: 'image_2.jpg' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The content item has been successfully created.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', example: '3f0192af-0720-4248-b4d4-d99a9f731d4f' },
            name: { type: 'string', example: 'tn gr2 eng t1 ch2d' },
            contentType: { type: 'string', example: 'Sentence' },
            imagePath: { type: 'string', example: 'image_2.jpg' },
            contentSourceData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  language: { type: 'string', example: 'en' },
                  audioUrl: { type: 'string', example: '' },
                  text: { type: 'string', example: 'Blue bird, blue bird, what do you see?' },
                  phonemes: { type: 'array', items: { type: 'string' }, example: ['b', 'l', 'u', 'b', 'ə', 'r', 'd', ',', 'b', 'l', 'u', 'b', 'ə', 'r', 'd', ',', 'w', 'ə', 't', 'd', 'u', 'j', 'u', 's', 'i', '?'] },
                  wordCount: { type: 'number', example: 8 },
                  wordFrequency: {
                    type: 'object',
                    example: {
                      blue: 2,
                      bird: 2,
                      what: 1,
                      do: 1,
                      you: 1,
                      see: 1
                    }
                  },
                  syllableCount: { type: 'number', example: 28 },
                  syllableCountMap: {
                    type: 'object',
                    example: {
                      blue: 4,
                      bird: 4,
                      what: 4,
                      do: 2,
                      you: 3,
                      see: 3
                    }
                  }
                }
              }
            },
            status: { type: 'string', example: 'live' },
            publisher: { type: 'string', example: 'ekstep' },
            language: { type: 'string', example: 'en' },
            contentIndex: { type: 'number', example: 1 },
            tags: { type: 'array', items: { type: 'string' }, example: [] },
            createdAt: { type: 'string', example: '2024-06-07T09:48:00.040Z' },
            updatedAt: { type: 'string', example: '2024-06-07T09:48:00.040Z' },
            _id: { type: 'string', example: '6662d7ff059b133df04db6e3' },
            contentId: { type: 'string', example: 'fa853c29-bf19-417a-9661-c67d2671ebc1' },
            __v: { type: 'number', example: 0 }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error while data is being stored to the content table',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        msg: { type: 'string', example: 'Server error - error message' },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  @ApiOperation({
    summary:
      'Store the data into to the content table',
  })
  @Post()
  async create(@Res() response: FastifyReply, @Body() content: any) {
    try {
      const lcSupportedLanguages = ['ta', 'ka', 'hi', 'te', 'kn'];

      const updatedcontentSourceData = await Promise.all(
        content.contentSourceData.map(async (contentSourceDataEle) => {
          if (lcSupportedLanguages.includes(contentSourceDataEle['language'])) {
            let contentLanguage = contentSourceDataEle['language'];

            if (contentSourceDataEle['language'] === 'kn') {
              contentLanguage = 'ka';
            }

            const url = process.env.ALL_LC_API_URL + contentLanguage;
            const textData = {
              request: {
                language_id: contentLanguage,
                text: contentSourceDataEle['text'],
              },
            };

            const newContent = await lastValueFrom(
              this.httpService
                .post(url, JSON.stringify(textData), {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                .pipe(map((resp) => resp.data)),
            );

            const newWordMeasures = Object.entries(
              newContent.result.wordMeasures,
            ).map((wordMeasuresEle) => {
              const wordComplexityMatrices: any = wordMeasuresEle[1];
              return { text: wordMeasuresEle[0], ...wordComplexityMatrices };
            });

            delete newContent.result.meanWordComplexity;
            delete newContent.result.totalWordComplexity;
            delete newContent.result.wordComplexityMap;
            delete newContent.result.syllableCount;
            delete newContent.result.syllableCountMap;

            async function getSyllableCount(text) {
              return splitGraphemes.splitGraphemes(
                text.replace(
                  /[\u200B\u200C\u200D\uFEFF\s!@#$%^&*()_+{}\[\]:;<>,.?\/\\|~'"-=]/g,
                  '',
                ),
              ).length;
            }

            const syllableCount = await getSyllableCount(
              contentSourceDataEle['text'],
            );

            const syllableCountMap = {};

            for (const wordEle of contentSourceDataEle['text'].split(' ')) {
              syllableCountMap[wordEle] = await getSyllableCount(wordEle);
            }

            newContent.result.wordMeasures = newWordMeasures;

            return {
              ...contentSourceDataEle,
              ...newContent.result,
              syllableCount: syllableCount,
              syllableCountMap: syllableCountMap,
            };
          } else if (contentSourceDataEle['language'] === 'en') {
            const url = process.env.ALL_TEXT_EVAL_URL + 'getPhonemes';

            const textData = {
              text: contentSourceDataEle['text'],
            };

            const newContent = await lastValueFrom(
              this.httpService
                .post(url, JSON.stringify(textData), {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                .pipe(map((resp) => resp.data)),
            );

            const text = contentSourceDataEle['text'].replace(/[^\w\s]/gi, '');

            const totalWordCount = text.split(' ').length;

            const totalSyllableCount = text
              .toLowerCase()
              .replace(/\s+/g, '')
              .split('').length;

            function countWordFrequency(text) {
              // Convert text to lowercase and split it into words
              const words = text
                .toLowerCase()
                .split(/\W+/)
                .filter((word) => word.length > 0);

              // Create an object to store word frequencies
              const wordFrequency = {};

              // Count the frequency of each word
              words.forEach((word) => {
                if (wordFrequency[word]) {
                  wordFrequency[word]++;
                } else {
                  wordFrequency[word] = 1;
                }
              });

              return wordFrequency;
            }

            function countUniqueCharactersPerWord(sentence) {
              // Convert the sentence to lowercase to make the count case-insensitive
              sentence = sentence.toLowerCase();

              // Split the sentence into words
              const words = sentence.split(/\s+/);

              // Create an object to store unique character counts for each word
              const uniqueCharCounts = {};

              // Iterate through each word
              words.forEach((word) => {
                uniqueCharCounts[word] = word
                  .toLowerCase()
                  .replace(/\s+/g, '')
                  .split('').length;
              });

              // Return the object containing unique character counts for each word
              return uniqueCharCounts;
            }

            const frequency = countWordFrequency(text);
            const syllableCountMap = countUniqueCharactersPerWord(text);

            return {
              ...contentSourceDataEle,
              ...newContent,
              wordCount: totalWordCount,
              wordFrequency: frequency,
              syllableCount: totalSyllableCount,
              syllableCountMap: syllableCountMap,
            };
          } else {
            return { ...contentSourceDataEle };
          }
        }),
      );

      content.contentSourceData = updatedcontentSourceData;

      const newContent = await this.contentService.create(content);

      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        data: newContent,
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Post('search')
  async searchContent(@Res() response: FastifyReply, @Body() tokenData: any) {
    try {
      const contentCollection = await this.contentService.search(
        tokenData.tokenArr,
        tokenData.language,
        tokenData.contentType,
        tokenData.limit,
        tokenData.tags,
        tokenData.cLevel,
        tokenData.complexityLevel,
        tokenData.graphemesMappedObj,
      );
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        data: contentCollection,
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Post('charNotPresent')
  async charNotPresentContent(
    @Res() response: FastifyReply,
    @Body() tokenData: any,
  ) {
    try {
      const contentCollection = await this.contentService.charNotPresent(
        tokenData.tokenArr,
      );
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        data: contentCollection,
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiQuery({
    name: 'pagination',
    description: 'Pagination parameters (page, limit, collectionId)',
    required: true,
    schema: {
      properties: {
        type: { type: 'string', description: 'content type', example: 'word' },
        page: { type: 'number', description: 'Page number', example: 1 },
        limit: { type: 'number', description: 'Items per page', example: 10 },
        collectionId: { type: 'string', description: 'ID of the collection', example: '3f0192af-0720-4248-b4d4-d99a9f731d4f' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'The content is search by using the collection id limit and page criteria',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '6662d7ff059b133df04db6e3' },
              contentType: { type: 'string', example: 'Sentence' },
              contentSourceData: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', example: 'Blue bird, blue bird, what do you see?' },
                    phonemes: {
                      type: 'array',
                      items: { type: 'string', example: ['b', 'l', 'u', 'b', 'ə', 'r'] }
                    },
                    syllableCount: { type: 'number', example: 28 }
                  }
                }
              },
              language: { type: 'string', example: 'en' },
              contentId: { type: 'string', example: 'fa853c29-bf19-417a-9661-c67d2671ebc1' }
            }
          }
        },
        totalSyllableCount: { type: 'number', example: 26 }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error while data is being stored to the content table',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        msg: { type: 'string', example: 'Server error - error message' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Get the content data with the collection id with pageNo and limit',
  })
  @Get('/pagination')
  async pagination(
    @Res() response: FastifyReply,
    @Query('type') type,
    @Query('collectionId') collectionId,
    @Query('page') page = 1,
    @Query() { limit = 5 },
  ) {
    try {
      const skip = (page - 1) * limit;
      const { data } = await this.contentService.pagination(
        skip,
        limit,
        type,
        collectionId,
      );
      const language = data[0].language;

      let totalSyllableCount = 0;
      if (language === 'en') {
        data.forEach((contentObject: any) => {
          totalSyllableCount +=
            contentObject.contentSourceData[0].phonemes.length;
        });
      } else {
        data.forEach((contentObject: any) => {
          totalSyllableCount +=
            contentObject.contentSourceData[0].syllableCount;
        });
      }
      return response.status(HttpStatus.OK).send({
        status: 'success',
        data,
        totalSyllableCount: totalSyllableCount,
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiQuery({
    name: 'pagination',
    description: 'Pagination parameters (page, limit, collectionId)',
    required: true,
    schema: {
      properties: {
        type: { type: 'string', description: 'content type', example: 'word' },
        language: { type: 'number', description: 'Page number', example: 1 },
        limit: { type: 'number', description: 'Items per page', example: 10 }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'The paginated content data has been successfully retrieved.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '6662d7ff059b133df04db6e3' },
              collectionId: { type: 'string', example: '3f0192af-0720-4248-b4d4-d99a9f731d4f' },
              name: { type: 'string', example: 'tn gr2 eng t1 ch2d' },
              contentType: { type: 'string', example: 'Sentence' },
              imagePath: { type: 'string', example: 'image_2.jpg' },
              contentSourceData: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    language: { type: 'string', example: 'en' },
                    audioUrl: { type: 'string', example: '' },
                    text: { type: 'string', example: 'Blue bird, blue bird, what do you see?' },
                    phonemes: {
                      type: 'array',
                      items: { type: 'string', example: ['b', 'l', 'u', 'b', 'ə', 'r', 'd', ',', 'b', 'l', 'u', 'b', 'ə', 'r', 'd', ',', 'w', 'ə', 't', 'd', 'u', 'j', 'u', 's', 'i', '?'] }
                    },
                    wordCount: { type: 'number', example: 8 },
                    wordFrequency: {
                      type: 'object',
                      example: {
                        blue: 2,
                        bird: 2,
                        what: 1,
                        do: 1,
                        you: 1,
                        see: 1
                      }
                    },
                    syllableCount: { type: 'number', example: 28 },
                    syllableCountMap: {
                      type: 'object',
                      example: {
                        blue: 4,
                        bird: 4,
                        what: 4,
                        do: 2,
                        you: 3,
                        see: 3
                      }
                    }
                  }
                }
              },
              status: { type: 'string', example: 'live' },
              publisher: { type: 'string', example: 'ekstep' },
              language: { type: 'string', example: 'en' },
              contentIndex: { type: 'number', example: 1 },
              tags: { type: 'array', items: { type: 'string' }, example: [] },
              createdAt: { type: 'string', example: '2024-06-07T09:48:00.040Z' },
              updatedAt: { type: 'string', example: '2024-06-07T09:48:00.040Z' },
              contentId: { type: 'string', example: 'fa853c29-bf19-417a-9661-c67d2671ebc1' },
              __v: { type: 'number', example: 0 }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error while data is being stored to the content table',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        msg: { type: 'string', example: 'Server error - error message' },
      },
    },
  })
  @Get('/getRandomContent')
  async getRandomContent(
    @Res() response: FastifyReply,
    @Query('type') type,
    @Query('language') language,
    @Query() { limit = 5 },
  ) {
    try {
      const Batch: any = limit;
      const { data } = await this.contentService.getRandomContent(
        parseInt(Batch),
        type,
        language,
      );
      return response.status(HttpStatus.OK).send({ status: 'success', data });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Get('/getContentWord')
  async getContentWord(
    @Res() response: FastifyReply,
    @Query('language') language,
    @Query() { limit = 5 },
  ) {
    try {
      const Batch: any = limit;
      const { data } = await this.contentService.getContentWord(
        parseInt(Batch),
        language,
      );
      return response.status(HttpStatus.OK).send({ status: 'success', data });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Get('/getContentSentence')
  async getContentSentence(
    @Res() response: FastifyReply,
    @Query('language') language,
    @Query() { limit = 5 },
  ) {
    try {
      const Batch: any = limit;
      const { data } = await this.contentService.getContentSentence(
        parseInt(Batch),
        language,
      );
      return response.status(HttpStatus.OK).send({ status: 'success', data });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Get('/getContentParagraph')
  async getContentParagraph(
    @Res() response: FastifyReply,
    @Query('language') language,
    @Query() { limit = 5 },
  ) {
    try {
      const Batch: any = limit;
      const { data } = await this.contentService.getContentParagraph(
        parseInt(Batch),
        language,
      );
      return response.status(HttpStatus.OK).send({ status: 'success', data });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiBody({
    description: 'Request body parameters for get content',
    required: true,
    schema: {
      type: 'object',
      properties: {
        tokenArr: {
          type: 'array',
          description: 'Array of tokens',
          items: {
            type: 'string',
            example: 'c'
          }
        },
        language: {
          type: 'string',
          description: 'Language code',
          example: 'en'
        },
        contentType: {
          type: 'string',
          description: 'Type of content',
          example: 'Word'
        },
        limit: {
          type: 'number',
          description: 'Limit on the number of items',
          example: 5
        },
        cLevel: {
          type: 'string',
          description: 'Content level',
          example: 'L2'
        },
        complexityLevel: {
          type: 'array',
          description: 'Array of complexity levels',
          items: {
            type: 'string',
            example: 'C1'
          }
        },
        graphemesMappedObj: {
          type: 'object',
          description: 'Object mapping graphemes to their representations',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'string',
              example: 'ch'
            }
          },
          example: {
            "c": ["ch"],
            "o": ["o"],
            "a": ["a"],
            "v": ["v", "ve"],
            "w": ["w", "wh"],
            "æ": ["a", "ai", "au"],
            "n": ["n"],
            "i": ["i"],
            "θ": ["th"]
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            wordsArr: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string', example: '660f9545367a62b3902dd58b' },
                  contentId: { type: 'string', example: 'f8dd7c97-53f7-4676-b597-4a52aaface5c' },
                  collectionId: { type: 'string', example: '6a519951-8635-4d89-821a-d3eb60f6e1ec' },
                  name: { type: 'string', example: 'L2_new_3' },
                  contentType: { type: 'string', example: 'Word' },
                  contentSourceData: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        language: { type: 'string', example: 'en' },
                        audioUrl: { type: 'string', example: '' },
                        text: { type: 'string', example: 'five' },
                        phonemes: {
                          type: 'array',
                          items: { type: 'string', example: 'f' }
                        },
                        wordCount: { type: 'number', example: 1 },
                        wordFrequency: {
                          type: 'object',
                          additionalProperties: { type: 'number', example: 1 }
                        },
                        syllableCount: { type: 'number', example: 4 },
                        syllableCountMap: {
                          type: 'object',
                          additionalProperties: { type: 'number', example: 4 }
                        },
                        syllableCountArray: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              k: { type: 'string', example: 'five' },
                              v: { type: 'number', example: 4 }
                            }
                          }
                        }
                      }
                    }
                  },
                  status: { type: 'string', example: 'live' },
                  publisher: { type: 'string', example: 'ekstep' },
                  language: { type: 'string', example: 'en' },
                  contentIndex: { type: 'number', example: 141 },
                  tags: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  createdAt: { type: 'string', example: '2024-04-05T05:45:55.335Z' },
                  updatedAt: { type: 'string', example: '2024-04-05T05:45:55.335Z' },
                  __v: { type: 'number', example: 0 },
                  matchedChar: {
                    type: 'array',
                    items: { type: 'string', example: 'v' }
                  }
                }
              }
            },
            contentForToken: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', example: '660f9545367a62b3902dd58b' },
                    contentId: { type: 'string', example: 'f8dd7c97-53f7-4676-b597-4a52aaface5c' },
                    collectionId: { type: 'string', example: '6a519951-8635-4d89-821a-d3eb60f6e1ec' },
                    name: { type: 'string', example: 'L2_new_3' },
                    contentType: { type: 'string', example: 'Word' },
                    contentSourceData: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          language: { type: 'string', example: 'en' },
                          audioUrl: { type: 'string', example: '' },
                          text: { type: 'string', example: 'five' },
                          phonemes: {
                            type: 'array',
                            items: { type: 'string', example: 'f' }
                          },
                          wordCount: { type: 'number', example: 1 },
                          wordFrequency: {
                            type: 'object',
                            additionalProperties: { type: 'number', example: 1 }
                          },
                          syllableCount: { type: 'number', example: 4 },
                          syllableCountMap: {
                            type: 'object',
                            additionalProperties: { type: 'number', example: 4 }
                          },
                          syllableCountArray: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                k: { type: 'string', example: 'five' },
                                v: { type: 'number', example: 4 }
                              }
                            }
                          }
                        }
                      }
                    },
                    status: { type: 'string', example: 'live' },
                    publisher: { type: 'string', example: 'ekstep' },
                    language: { type: 'string', example: 'en' },
                    contentIndex: { type: 'number', example: 141 },
                    tags: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    createdAt: { type: 'string', example: '2024-04-05T05:45:55.335Z' },
                    updatedAt: { type: 'string', example: '2024-04-05T05:45:55.335Z' },
                    __v: { type: 'number', example: 0 },
                    matchedChar: {
                      type: 'array',
                      items: { type: 'string', example: 'v' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error while fetching data from the content table',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        msg: { type: 'string', example: 'Server error - error message' },
      },
    },
  })
  @ApiOperation({
    summary: 'Get all data from the content table'
  })
  @Post('/getContent')
  async getContent(@Res() response: FastifyReply, @Body() queryData: any) {
    try {
      const Batch: any = queryData.limit || 5;
      const contentCollection = await this.contentService.search(
        queryData.tokenArr,
        queryData.language,
        queryData.contentType,
        parseInt(Batch),
        queryData.tags,
        queryData.cLevel,
        queryData.complexityLevel,
        queryData.graphemesMappedObj,
      );
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        data: contentCollection,
      });
    } catch (error) {
      console.log(error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Post('/getContentByFilters')
  async getContentByFilters(@Res() response: FastifyReply, @Body() queryData: any) {
    try {
      let Batch: any = queryData.limit || 5;

      const contentCollection = await this.contentService.searchByFilter(queryData?.syllableList, queryData?.syllableCount, queryData?.wordCount, queryData?.totalOrthoComplexity, queryData?.totalPhonicComplexity, queryData?.meanPhonicComplexity, queryData.language, queryData.contentType, parseInt(Batch), queryData?.contentId, queryData?.collectionId, queryData?.tags);
      return response.status(HttpStatus.CREATED).send({
        status: "success",
        data: contentCollection,
      });
    } catch (error) {
      console.log(error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: "error",
        message: "Server error - " + error
      });
    }
  }


  @ApiBody({
    description: 'Request body parameters',
    required: true,
    schema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          description: 'Array of tags',
          items: {
            type: 'string',
            example: 'ASER'
          }
        },
        language: {
          type: 'string',
          description: 'Language code',
          example: 'ta'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '65e88b6cdee499a6209e739e' },
              name: { type: 'string', example: '(மாதிறி -4)எழுத்து' },
              category: { type: 'string', example: 'Char' },
              collectionId: { type: 'string', example: 'ed47eb63-87c8-41f4-821d-1400fef37b78' }
            }
          }
        },
        status: { type: 'number', example: 200 }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error while get the data from the content',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        msg: { type: 'string', example: 'Server error - error message' },
      },
    },
  })
  @ApiOperation({
    summary: 'Get Assessments data'
  })
  @Post('/getAssessment')
  async getAssessment(@Res() response: FastifyReply, @Body() queryData: any) {
    try {
      let contentCollection;

      if (queryData.tags.includes("ASER")) {
        let collectionArr = [];
        for (let setno = 1; setno <= 5; setno++) {
          let tags = [];
          tags.push(...queryData.tags);
          tags.push("set" + setno);
          let collection = await this.collectionService.getAssessment(tags, queryData.language);
          if (collection.data[0] != null) {
            collectionArr.push(collection.data[0]);
          }
        }
        contentCollection = {
          data: collectionArr,
          status: 200
        };
      } else {
        contentCollection = await this.collectionService.getAssessment(queryData.tags, queryData.language);
      }

      return response.status(HttpStatus.CREATED).send(contentCollection);
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: "error",
        message: "Server error - " + error
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Post('/getContentForMileStone')
  async get(@Res() response: FastifyReply, @Body() queryData: any) {
    try {
      const Batch: any = queryData.limit || 5;
      const contentCollection = await this.contentService.getContentLevelData(
        queryData.cLevel,
        queryData.complexityLevel,
        queryData.language,
        parseInt(Batch),
        queryData.contentType,
      );
      return response.status(HttpStatus.CREATED).send({
        status: 'success',
        contentCollection,
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Get()
  async fetchAll(@Res() response: FastifyReply, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    try {
      const limitCount = limit;
      const data = await this.contentService.readAll(page, limit);
      const dataCount: any = await this.contentService.countAll();
      const pageCount = Math.trunc(dataCount / limitCount);
      return response.status(HttpStatus.OK).send({
        status: 'success',
        recordCount: dataCount,
        pageCount: pageCount,
        data
      });

    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: "error",
        message: "Server error - " + error
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Get('/:id')
  async findById(@Res() response: FastifyReply, @Param('id') id) {
    const content = await this.contentService.readById(id);
    return response.status(HttpStatus.OK).send({
      content,
    });
  }

  @ApiExcludeEndpoint(true)
  @Put('/:id')
  async update(
    @Res() response: FastifyReply,
    @Param('id') id,
    @Body() content: any,
  ) {
    try {
      const lcSupportedLanguages = ['ta', 'ka', 'hi', 'te', 'kn'];

      const updatedcontentSourceData = await Promise.all(
        content.contentSourceData.map(async (contentSourceDataEle) => {
          if (lcSupportedLanguages.includes(contentSourceDataEle['language'])) {
            let contentLanguage = contentSourceDataEle['language'];

            if (contentSourceDataEle['language'] === 'kn') {
              contentLanguage = 'ka';
            }

            const url = process.env.ALL_LC_API_URL + contentLanguage;
            const textData = {
              request: {
                language_id: contentLanguage,
                text: contentSourceDataEle['text'],
              },
            };

            const newContent = await lastValueFrom(
              this.httpService
                .post(url, JSON.stringify(textData), {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                .pipe(map((resp) => resp.data)),
            );

            const newWordMeasures = Object.entries(
              newContent.result.wordMeasures,
            ).map((wordMeasuresEle) => {
              const wordComplexityMatrices: any = wordMeasuresEle[1];
              return { text: wordMeasuresEle[0], ...wordComplexityMatrices };
            });

            delete newContent.result.meanWordComplexity;
            delete newContent.result.totalWordComplexity;
            delete newContent.result.wordComplexityMap;

            newContent.result.wordMeasures = newWordMeasures;

            return { ...contentSourceDataEle, ...newContent.result };
          } else if (contentSourceDataEle['language'] === 'en') {
            const url = process.env.ALL_TEXT_EVAL_URL + 'getPhonemes';

            const textData = {
              text: contentSourceDataEle['text'],
            };

            const newContent = await lastValueFrom(
              this.httpService
                .post(url, JSON.stringify(textData), {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                .pipe(map((resp) => resp.data)),
            );

            const text = contentSourceDataEle['text'].replace(/[^\w\s]/gi, '');

            const totalWordCount = text.split(' ').length;

            const totalSyllableCount = text
              .toLowerCase()
              .replace(/\s+/g, '')
              .split('').length;

            function countWordFrequency(text) {
              // Convert text to lowercase and split it into words
              const words = text
                .toLowerCase()
                .split(/\W+/)
                .filter((word) => word.length > 0);

              // Create an object to store word frequencies
              const wordFrequency = {};

              // Count the frequency of each word
              words.forEach((word) => {
                if (wordFrequency[word]) {
                  wordFrequency[word]++;
                } else {
                  wordFrequency[word] = 1;
                }
              });

              return wordFrequency;
            }

            function countUniqueCharactersPerWord(sentence) {
              // Convert the sentence to lowercase to make the count case-insensitive
              sentence = sentence.toLowerCase();

              // Split the sentence into words
              const words = sentence.split(/\s+/);

              // Create an object to store unique character counts for each word
              const uniqueCharCounts = {};

              // Iterate through each word
              words.forEach((word) => {
                uniqueCharCounts[word] = word
                  .toLowerCase()
                  .replace(/\s+/g, '')
                  .split('').length;
              });

              // Return the object containing unique character counts for each word
              return uniqueCharCounts;
            }

            const frequency = countWordFrequency(text);
            const syllableCountMap = countUniqueCharactersPerWord(text);

            return {
              ...contentSourceDataEle,
              ...newContent,
              wordCount: totalWordCount,
              wordFrequency: frequency,
              syllableCount: totalSyllableCount,
              syllableCountMap: syllableCountMap,
            };
          } else {
            return { ...contentSourceDataEle };
          }
        }),
      );

      content.contentSourceData = updatedcontentSourceData;
      const updatedContent = await this.contentService.update(id, content);

      return response.status(HttpStatus.OK).send({
        status: 'success',
        data: updatedContent,
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'error',
        message: 'Server error - ' + error,
      });
    }
  }

  @ApiExcludeEndpoint(true)
  @Delete('/:id')
  async delete(@Res() response: FastifyReply, @Param('id') id) {
    const deleted = await this.contentService.delete(id);
    return response.status(HttpStatus.OK).send({
      deleted,
    });
  }
}
