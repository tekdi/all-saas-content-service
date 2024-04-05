import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import { content } from "../schemas/content.schema";
import { contentService } from "../services/content.service";
import { CollectionService } from "../services/collection.service";
import { FastifyReply } from 'fastify';
import { HttpService } from "@nestjs/axios";
import { firstValueFrom, lastValueFrom, map } from "rxjs";
import { ApiBody, ApiExcludeEndpoint, ApiForbiddenResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as splitGraphemes from 'split-graphemes';

@ApiTags('content')
@Controller('content')
export class contentController {
    constructor(private readonly contentService: contentService, private readonly collectionService: CollectionService, private readonly httpService: HttpService) { }

    @Post()
    async create(@Res() response: FastifyReply, @Body() content: any) {
        try {

            let lcSupportedLanguages = [
                "ta",
                "ka",
                "hi",
                "te",
                "kn"
            ]

            const updatedcontentSourceData = await Promise.all(content.contentSourceData.map(async (contentSourceDataEle) => {

                if (lcSupportedLanguages.includes(contentSourceDataEle['language'])) {
                    let contentLanguage = contentSourceDataEle['language'];

                    if (contentSourceDataEle['language'] === "kn") {
                        contentLanguage = "ka";
                    }

                    const url = process.env.ALL_LC_API_URL + contentLanguage;
                    const textData = {
                        "request": {
                            'language_id': contentLanguage,
                            'text': contentSourceDataEle['text']
                        }
                    };

                    const newContent = await lastValueFrom(
                        this.httpService.post(url, JSON.stringify(textData), {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }).pipe(
                            map((resp) => resp.data)
                        )
                    );


                    let newWordMeasures = Object.entries(newContent.result.wordMeasures).map((wordMeasuresEle) => {
                        let wordComplexityMatrices: any = wordMeasuresEle[1];
                        return { text: wordMeasuresEle[0], ...wordComplexityMatrices }
                    });

                    delete newContent.result.meanWordComplexity;
                    delete newContent.result.totalWordComplexity;
                    delete newContent.result.wordComplexityMap;
                    delete newContent.result.syllableCount;
                    delete newContent.result.syllableCountMap;

                    async function getSyllableCount(text) {
                        return splitGraphemes.splitGraphemes(text.replace(/[\u200B\u200C\u200D\uFEFF\s!@#$%^&*()_+{}\[\]:;<>,.?\/\\|~'"-=]/g, '')).length;
                    }

                    let syllableCount = await getSyllableCount(contentSourceDataEle['text']);

                    let syllableCountMap = {}

                    for (let wordEle of contentSourceDataEle['text'].split(" ")) {
                        syllableCountMap[wordEle] = await getSyllableCount(wordEle);
                    }

                    newContent.result.wordMeasures = newWordMeasures;

                    return { ...contentSourceDataEle, ...newContent.result, syllableCount: syllableCount, syllableCountMap: syllableCountMap };
                } else if (contentSourceDataEle['language'] === "en") {
                    const url = process.env.ALL_TEXT_EVAL_URL + 'getPhonemes';

                    const textData = {
                        'text': contentSourceDataEle['text']
                    };

                    const newContent = await lastValueFrom(
                        this.httpService.post(url, JSON.stringify(textData), {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }).pipe(
                            map((resp) => resp.data)
                        )
                    );

                    let text = contentSourceDataEle['text'].replace(/[^\w\s]/gi, '');

                    let totalWordCount = text.split(" ").length;

                    let totalSyllableCount = text.toLowerCase().replace(/\s+/g, '').split("").length;

                    function countWordFrequency(text) {
                        // Convert text to lowercase and split it into words
                        const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 0);

                        // Create an object to store word frequencies
                        const wordFrequency = {};

                        // Count the frequency of each word
                        words.forEach(word => {
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
                        words.forEach(word => {
                            uniqueCharCounts[word] = word.toLowerCase().replace(/\s+/g, '').split("").length;
                        });

                        // Return the object containing unique character counts for each word
                        return uniqueCharCounts;
                    }

                    let frequency = countWordFrequency(text);
                    let syllableCountMap = countUniqueCharactersPerWord(text);

                    return { ...contentSourceDataEle, ...newContent, wordCount: totalWordCount, wordFrequency: frequency, syllableCount: totalSyllableCount, syllableCountMap: syllableCountMap };
                } else {
                    return { ...contentSourceDataEle }
                }
            }));

            content.contentSourceData = updatedcontentSourceData;

            const newContent = await this.contentService.create(content);

            return response.status(HttpStatus.CREATED).send({
                status: "success",
                data: newContent
            });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Post('search')
    async searchContent(@Res() response: FastifyReply, @Body() tokenData: any) {
        try {
            const contentCollection = await this.contentService.search(tokenData.tokenArr, tokenData.language, tokenData.contentType, tokenData.limit, tokenData.tags, tokenData.cLevel, tokenData.complexityLevel, tokenData.graphemesMappedObj);
            return response.status(HttpStatus.CREATED).send({
                status: "success",
                data: contentCollection,
            });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Post('charNotPresent')
    async charNotPresentContent(@Res() response: FastifyReply, @Body() tokenData: any) {
        try {
            const contentCollection = await this.contentService.charNotPresent(tokenData.tokenArr);
            return response.status(HttpStatus.CREATED).send({
                status: "success",
                data: contentCollection,
            });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Get('/pagination')
    async pagination(@Res() response: FastifyReply, @Query('type') type, @Query('collectionId') collectionId, @Query('page') page = 1, @Query() { limit = 5 }) {
        try {
            const skip = (page - 1) * limit;
            const { data } = await this.contentService.pagination(skip, limit, type, collectionId);

            let language = data[0].language;

            let totalSyllableCount = 0;
            if (language === "en") {
                data.forEach((contentObject: any) => {
                    totalSyllableCount += contentObject.contentSourceData[0].phonemes.length;
                });
            } else {
                data.forEach((contentObject: any) => {
                    totalSyllableCount += contentObject.contentSourceData[0].syllableCount;
                });
            }
            return response.status(HttpStatus.OK).send({ status: 'success', data, totalSyllableCount: totalSyllableCount });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Get('/getRandomContent')
    async getRandomContent(@Res() response: FastifyReply, @Query('type') type, @Query('language') language, @Query() { limit = 5 }) {
        try {
            let Batch: any = limit;
            const { data } = await this.contentService.getRandomContent(parseInt(Batch), type, language);
            return response.status(HttpStatus.OK).send({ status: 'success', data });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Get('/getContentWord')
    async getContentWord(@Res() response: FastifyReply, @Query('language') language, @Query() { limit = 5 }) {
        try {
            let Batch: any = limit;
            const { data } = await this.contentService.getContentWord(parseInt(Batch), language);
            return response.status(HttpStatus.OK).send({ status: 'success', data });
        } catch (error) {

            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }


    @Get('/getContentSentence')
    async getContentSentence(@Res() response: FastifyReply, @Query('language') language, @Query() { limit = 5 }) {
        try {
            let Batch: any = limit;
            const { data } = await this.contentService.getContentSentence(parseInt(Batch), language);
            return response.status(HttpStatus.OK).send({ status: 'success', data });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Get('/getContentParagraph')
    async getContentParagraph(@Res() response: FastifyReply, @Query('language') language, @Query() { limit = 5 }) {
        try {
            let Batch: any = limit;
            const { data } = await this.contentService.getContentParagraph(parseInt(Batch), language);
            return response.status(HttpStatus.OK).send({ status: 'success', data });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Post('/getContent')
    async getContent(@Res() response: FastifyReply, @Body() queryData: any) {
        try {
            let Batch: any = queryData.limit || 5;
            const contentCollection = await this.contentService.search(queryData.tokenArr, queryData.language, queryData.contentType, parseInt(Batch), queryData.tags, queryData.cLevel, queryData.complexityLevel, queryData.graphemesMappedObj);
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

    @Post('/getContentForMileStone')
    async get(@Res() response: FastifyReply, @Body() queryData: any) {
        try {
            let Batch: any = queryData.limit || 5;
            const contentCollection = await this.contentService.getContentLevelData(queryData.cLevel, queryData.complexityLevel, queryData.language, parseInt(Batch), queryData.contentType);
            return response.status(HttpStatus.CREATED).send({
                status: "success",
                contentCollection,
            });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }


    @Get()
    async fatchAll(@Res() response: FastifyReply) {
        try {
            const data = await this.contentService.readAll();
            return response.status(HttpStatus.OK).send({ status: 'success', data });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }

    @Get('/:id')
    async findById(@Res() response: FastifyReply, @Param('id') id) {
        const content = await this.contentService.readById(id);
        return response.status(HttpStatus.OK).send({
            content
        })
    }

    @Put('/:id')
    async update(@Res() response: FastifyReply, @Param('id') id, @Body() content: any) {
        try {
            let lcSupportedLanguages = ["ta", "ka", "hi", "te", "kn"];

            const updatedcontentSourceData = await Promise.all(content.contentSourceData.map(async (contentSourceDataEle) => {
                if (lcSupportedLanguages.includes(contentSourceDataEle['language'])) {
                    let contentLanguage = contentSourceDataEle['language'];

                    if (contentSourceDataEle['language'] === "kn") {
                        contentLanguage = "ka";
                    }

                    const url = process.env.ALL_LC_API_URL + contentLanguage;
                    const textData = {
                        "request": {
                            'language_id': contentLanguage,
                            'text': contentSourceDataEle['text']
                        }
                    };

                    const newContent = await lastValueFrom(
                        this.httpService.post(url, JSON.stringify(textData), {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }).pipe(
                            map((resp) => resp.data)
                        )
                    );

                    let newWordMeasures = Object.entries(newContent.result.wordMeasures).map((wordMeasuresEle) => {
                        let wordComplexityMatrices: any = wordMeasuresEle[1];
                        return { text: wordMeasuresEle[0], ...wordComplexityMatrices }
                    });

                    delete newContent.result.meanWordComplexity;
                    delete newContent.result.totalWordComplexity;
                    delete newContent.result.wordComplexityMap;

                    newContent.result.wordMeasures = newWordMeasures;

                    return { ...contentSourceDataEle, ...newContent.result };
                } else if (contentSourceDataEle['language'] === "en") {
                    const url = process.env.ALL_TEXT_EVAL_URL + 'getPhonemes';

                    const textData = {
                        'text': contentSourceDataEle['text']
                    };

                    const newContent = await lastValueFrom(
                        this.httpService.post(url, JSON.stringify(textData), {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }).pipe(
                            map((resp) => resp.data)
                        )
                    );

                    let text = contentSourceDataEle['text'].replace(/[^\w\s]/gi, '');

                    let totalWordCount = text.split(" ").length;

                    let totalSyllableCount = text.toLowerCase().replace(/\s+/g, '').split("").length;

                    function countWordFrequency(text) {
                        // Convert text to lowercase and split it into words
                        const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 0);

                        // Create an object to store word frequencies
                        const wordFrequency = {};

                        // Count the frequency of each word
                        words.forEach(word => {
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
                        words.forEach(word => {
                            uniqueCharCounts[word] = word.toLowerCase().replace(/\s+/g, '').split("").length;
                        });

                        // Return the object containing unique character counts for each word
                        return uniqueCharCounts;
                    }

                    let frequency = countWordFrequency(text);
                    let syllableCountMap = countUniqueCharactersPerWord(text);

                    return { ...contentSourceDataEle, ...newContent, wordCount: totalWordCount, wordFrequency: frequency, syllableCount: totalSyllableCount, syllableCountMap: syllableCountMap };
                } else {
                    return { ...contentSourceDataEle }
                }
            }));

            content.contentSourceData = updatedcontentSourceData;
            const updatedContent = await this.contentService.update(id, content);

            return response.status(HttpStatus.OK).send({
                status: "success",
                data: updatedContent
            });
        } catch (error) {
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: "error",
                message: "Server error - " + error
            });
        }
    }


    @Delete('/:id')
    async delete(@Res() response: FastifyReply, @Param('id') id) {
        const deleted = await this.contentService.delete(id);
        return response.status(HttpStatus.OK).send({
            deleted
        })
    }
}
