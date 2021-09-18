const download = require("./download");
const EventEmitter = require('events');
/**
 *  Responsible for identifying common errors and providing guidance to the student
 *
 *
 */
module.exports = class Grader extends EventEmitter {

    /**
     *  Example answer key - overwritten in constructor
     *  Answers/Fields must be named answer{n} in sequential order
     */
    answerKey = {
        answer1: {
            mustAppear: ['c_scale', 'w_400', 'l_twilioquest:cloudinary_icon', 'g_south_west', 'o_50', 'x_10', 'y_10', 'eo_10', 'TwilioQuest/Flower.mp4'],
            mustAppearInOrder: [
                ['/c_scale', '/l_'],
                ['l_', 'x_'],
                ['l_', 'y_'],
                ['l_', 'o_'],
                ['l_', 'eo_'],
            ],
        },
        answer2: {
            mustAppear: ['c_scale', 'w_400', 'l_twilioquest:cloudinary_icon', 'g_south_west', 'o_50', 'x_10', 'y_10', 'eo_10', 'TwilioQuest/Flower.mp4'],
            mustAppearInOrder: [
                ['/c_scale', '/l_'],
                ['l_', 'x_'],
                ['l_', 'y_'],
                ['l_', 'o_'],
                ['l_', 'eo_'],
            ]
        }
    };

    /**
     *
     * @type {{answer3: string, answer2: string, answer4: string, answer1: string}}
     */
    answers = {answer1: 'url1', answer2: 'url2', answer3: 'url3', answer4: 'etc...'};

    objectivePrefix = ''; //something to help uniquely name/scope saved files
    correct = [];//The list of responses for answers that are fully correct
    wrong = [];//The list of responses for answers that contain a mistake.
    downloadedFiles = [];

    /**
     * Local reference to validator helper so that we can get answers and output our response after grading
     */
    helper;

    correctMessage = '';
    problemsMessage = '';

    /**
     * @todo-p2 need to complete this list by adding missing arguments and documentation links
     * @type {{so_: {docsUrl: string, title: string}, c_scale: {docsUrl: string, title: string}, y_: {docsUrl: string, title: string}, x_: {docsUrl: string, title: string}, w_: {docsUrl: string, title: string}, br_: {docsUrl: string, title: string}, du_: {docsUrl: string, title: string}, o_: {docsUrl: string, title: string}, co_: {docsUrl: string, title: string}, bo_: {docsUrl: string, title: string}, l_: {docsUrl: string, title: string}, eo_: {docsUrl: string, title: string}, c_crop: {docsUrl: string, title: string}, dl_: {docsUrl: string, title: string}, h_: {docsUrl: string, title: string}, g_: {docsUrl: string, title: string}, c_: {docsUrl: string, title: string}, b_: {docsUrl: string, title: string}}}
     */
    actionDescriptions =
        {
            'b_': {
                title: 'background',
                docsUrl: 'https://cloudinary.com/documentation/transformation_reference#b_background'
            },
            'bo_': {
                title: 'border',
                docsUrl: 'https://cloudinary.com/documentation/transformation_reference#bo_border'
            },
            'br_': {
                title: 'bitrate',
                docsUrl: 'https://cloudinary.com/documentation/transformation_reference#br_bitrate'
            },
            'c_': {
                title: 'crop/resize',
                docsUrl: 'https://cloudinary.com/documentation/transformation_reference#c_crop_resize'
            },
            'c_crop': {
                title: 'crop',
                docsUrl: 'https://cloudinary.com/documentation/transformation_reference#c_crop'
            },
            'c_scale': {
                title: 'scale',
                docsUrl: 'https://cloudinary.com/documentation/transformation_reference#c_scale'
            },
            'co_': {title: 'color', docsUrl: ''},
            'dl_': {title: 'delay', docsUrl: ''},
            'du_': {title: 'duration', docsUrl: ''},
            'w_': {title: 'width', docsUrl: ''},
            'g_': {title: 'gravity', docsUrl: ''},
            'eo_': {title: 'timing offset end', docsUrl: ''},
            'so_': {title: 'timing offset start', docsUrl: ''},
            'r_': {
                title: 'rounding',
                docsUrl: 'https://cloudinary.com/documentation/video_manipulation_and_delivery#rounding_corners_and_creating_circular_videos'
            },
            'h_': {title: 'height', docsUrl: ''},
            'l_': {title: 'layer', docsUrl: ''},
            'o_': {title: 'opacity', docsUrl: ''},
            'x_': {title: 'x location or offset', docsUrl: ''},
            'y_': {title: 'y location or offset', docsUrl: ''},
        };

    constructor(helper, answerKey, pass, fail) {
        super();

        this.helper = helper;
        this.answers = helper.validationFields;
        this.objectivePrefix = helper.context.hackObject.objectiveName+"_";

        this.answerKey = answerKey;

        //Update messages success/failure messages before letting anyone else know about pass/fail
        this.on('pass', () => this.updateMessages());
        this.on('fail', () => this.updateMessages());

        //Attach methods if they were provided
        pass !== undefined && this.on('pass', pass);
        fail !== undefined && this.on('fail', fail);

        /**
         * A helper function
         * Returns true if A and B are appear in the string and appear in order of A then B.
         * @param {string} a
         * @param {string} b
         */
        String.prototype.inOrderOf = function (a, b) {
            return (0 <= this.indexOf(a) && this.indexOf(a) < this.indexOf(b));
        }
    }

    /**
     * Review the submission and grade it by providing guidance for any mistakes
     */
    grade() {
        let self = this;

        this.checkForMissingAnswers();

        this.applyAnswerKey();

        if (this.wrong.length > 0) {
            this.helper.fail(this.problemsMessage);
            this.emit('fail', this);
            return;
        }

        this.downloadFiles().then(function (filenames) {
            self.downloadedFiles = filenames;

            let downloadErrors = '';
            for (let i = 0; i < self.downloadedFiles.length; i++) {
                if (typeof self.downloadedFiles[i] == 'undefined') {
                    downloadErrors += `<br>Answer ${i + 1} could not be downloaded, check the url.`;
                }
            }

            if (downloadErrors) {
                self.helper.fail(downloadErrors);
                self.emit('fail', this);

            } else {
                self.emit('pass', this);
            }

        });

    }

    /**
     * Download the url answers as a final test and to use in the browser results
     * @returns {Promise<unknown[]>}
     */
    downloadFiles() {

        let grader = this;

        try {

            return Promise.all(
                Object.keys(this.answers).map((answer) => download(grader.answers[answer], grader.objectivePrefix + answer + '.mp4'))
            ).catch((e) => {
                this.helper.fail(e);
            });
        } catch (e) {
            this.helper.fail(e);
        }
    }

    /**
     * Identify answers that weren't filled out
     */
    checkForMissingAnswers() {
        //
        for (let i = 1; i <= Object.keys(this.answerKey).length; i++) {
            if (!this.answers.hasOwnProperty('answer' + i) || this.answers['answer' + i] === '') {
                this.wrong.push(`Answer ${i} is missing.`);

                //remove the answer key entry so we don't further process this answer
                delete this.answerKey['answer' + i];
            }
        }
    }

    /**
     * NOTE:  This function and answer key schema does not currently support answers with multiple occurrences of a
     * pattern, including multiples in the submitted answer (ex. w_150...w_200 when either or both is wrong)
     *
     * @todo check for specified parameters that are extra/not needed
     *
     */
    applyAnswerKey() {

        for (const key in this.answers) {
            let self = this;

            //replace leading non-digits with nothing to extract the Answer number
            let answerNumber = key.replace(/^\D+/g, '');

            //See if every required parameter appears in the answer
            if (!this.answerKey[key].mustAppear.every((param) =>
                this.answers[key].includes(param) ||
                this.wrong.push(`Answer ${answerNumber}: ` + this.guidance(this.answers[key], param))
            )) {
                continue //only show one error for an answer at a time
            }

            let wrongOrder = false;
            if (this.answerKey[key].mustAppearInOrder) {
                this.answerKey[key].mustAppearInOrder.forEach(function (order) {
                    if (wrongOrder) return;//only include one at a time to avoid cascade of all dependant cases

                    if (self.answers[key].includes(order[0]) &&
                        self.answers[key].includes(order[1]) &&
                        !self.answers[key].inOrderOf(...order)) {
                        self.wrong.push(`Answer ${answerNumber}: ${order[0]} must come before ${order[1]}.`);
                        wrongOrder = true;
                    }
                });
            }

            if (self.wrong.length === 0) {
                this.correct.push(`Answer ${answerNumber}`);
            }
        }
    }


    guidance(actual, expected) {
        console.log({expected: expected, actual: actual});
        //look for existence of the action
        let action = expected.substring(0, expected.indexOf('_') + 1);
        if (actual.indexOf(action) === -1 || action === '') {

            if (typeof this.actionDescriptions[action] !== 'undefined') {
                let name = this.actionDescriptions[action].title;

                //Wrap with a link to documentation if we have a link
                if (typeof this.actionDescriptions[action].docsUrl !== 'undefined' && this.actionDescriptions[action].docsUrl !== '') {
                    name = `<a target="_blank" href="${this.actionDescriptions[action].docsUrl}">${out}</a>`;
                }

                return `Needs ${name} parameter (hint: ${action}).`;


            } else {
                console.warn(`No entry in guidance for action:${action}`);
                return `Expecting the url to contain '${expected}'.`;
            }
        }

        //it does exist, so now see if we can provide a tailored explanation for why it's still wrong
        switch (action) {
            case 'w_':
                const expectedWidth = expected.substring(expected.indexOf('_') + 1);
                return `The width should be ${expectedWidth}`;

            default:
                return `The ${this.actionDescriptions[action].title} parameter isn't quite right, expected {`;

        }
    }

    updateMessages() {
        this.correctMessage = "<div style='text-align: left;'>" +
            (this.correct.length > 0 ? "Correct Answers:" + Grader.pretty(this.correct) + "</div>"
                : '');

        this.problemsMessage = "<div style='text-align: left;'>Needs Improvement:" + Grader.pretty(this.wrong) + "</div>";

        if (this.wrong.length > 0) {
            this.helper.fail(this.correctMessage + this.problemsMessage);
            return false;
        }
        return true;
    }

    getSuccessMessage(){
        return this.correctMessage;
    }

    static pretty(list) {
        return "<ul><li>" + list.join("</li><li>") + "</li></ul>";
    }
}