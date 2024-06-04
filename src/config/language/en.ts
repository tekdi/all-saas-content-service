var en_config = {
    language_code: "en",
    contentLevel: [
        {
            level: 'L1',
            syllableCount: { $gte: 2, $lte: 3 },
            contentType: 'Word',
        },
        {
            level: 'L1',
            wordCount: { $gte: 2, $lte: 3 },
            contentType: 'Sentence',
        },
        {
            level: 'L2',
            syllableCount: { $eq: 4 },
            contentType: 'Word',
        },
        {
            level: 'L2',
            wordCount: { $gte: 2, $lte: 3 },
            syllableCount: { $lte: 8 },
            syllableCountArray: {
                $not: {
                    $elemMatch: {
                        v: { $gte: 4 },
                    },
                },
            },
            contentType: 'Sentence',
        },
        {
            level: 'L3',
            syllableCount: { $gt: 4 },
            contentType: 'Word',
        },
        {
            level: 'L3',
            wordCount: { $gt: 2, $lte: 5 },
            syllableCount: { $lte: 15 },
            syllableCountArray: {
                $not: {
                    $elemMatch: {
                        v: { $gte: 5 },
                    },
                },
            },
            contentType: 'Sentence',
        },
        {
            level: 'L4',
            wordCount: { $gt: 5, $lte: 7 },
            syllableCount: { $lte: 20 },
            syllableCountArray: {
                $not: {
                    $elemMatch: {
                        v: { $gte: 7 },
                    },
                },
            },
            contentType: 'Sentence',
        },
        {
            level: 'L4',
            wordCount: { $lte: 10 },
            contentType: 'Paragraph',
        },
        {
            level: 'L5',
            wordCount: { $gte: 7, $lte: 10 },
            contentType: 'Sentence',
        },
        {
            level: 'L5',
            wordCount: { $gt: 10, $lte: 15 },
            contentType: 'Paragraph',
        },
        {
            level: 'L6',
            wordCount: { $gte: 7, $lte: 12 },
            contentType: 'Sentence',
        },
        {
            level: 'L6',
            wordCount: { $gt: 15 },
            contentType: 'Paragraph',
        },
    ]
};

export default en_config;