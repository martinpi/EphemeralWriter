/**
 * @author Kate Compton
 */


/**
 * Description
 * @param {string} c
 * @returns {boolean}
 */
var isConsonant = function (c) {
    c = c.toLowerCase();
    switch (c) {
        case 'a':
            return false;
        case 'e':
            return false;
        case 'i':
            return false;
        case 'o':
            return false;
        case 'u':
            return false;

    }
    return true;
};

/**
 * Description
 * @param {string} s
 * @returns {boolean}
 */
function endsWithConY(s) {
    if (s.charAt(s.length - 1) === 'y') {
        return isConsonant(s.charAt(s.length - 2));
    }
    return false;
};

var modifiers = {
    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    capitaliseAll: function (s) {
        return s.replace(/(?:^|\s)\S/g, function (a) {
            return a.toUpperCase();
        });

    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    capitalizeAll: function (s) {
        return s.replace(/(?:^|\s)\S/g, function (a) {
            return a.toUpperCase();
        });

    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    caps: function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);

    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    capitalize: function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);

    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    inQuotes: function (s) {
        return '"' + s + '"';
    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    comma: function (s) {
        var last = s.charAt(s.length - 1);
        if (last === ",")
            return s;
        if (last === ".")
            return s;
        if (last === "?")
            return s;
        if (last === "!")
            return s;
        return s + ",";
    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    beeSpeak: function (s) {
        //            s = s.replace("s", "zzz");

        s = s.replace(/s/, 'zzz');
        return s;
    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    a: function (s) {
        if (!isConsonant(s.charAt(0)))
            return "an " + s;
        return "a " + s;

    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    s: function (s) {

        var last = s.charAt(s.length - 1);

        switch (last) {
            case 'y':

                // rays, convoys
                if (!isConsonant(s.charAt(s.length - 2))) {
                    return s + "s";
                }
                // harpies, cries
                else {
                    return s.slice(0, s.length - 1) + "ies";
                }
                break;

            // oxen, boxen, foxen
            case 'x':
                return s.slice(0, s.length - 1) + "en";
            case 'z':
                return s.slice(0, s.length - 1) + "es";
            case 'h':
                return s.slice(0, s.length - 1) + "es";

            default:
                return s + "s";
        };

    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    n: function (s) {
        return s + "\n";
    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    title: function (s) {
        return s.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    },

    /**
     * Description
     * @param {string} s
     * @returns {string}
     */
    ed: function (s) {

        var index = s.indexOf(" ");
        var s = s;
        var rest = "";
        if (index > 0) {
            rest = s.substring(index, s.length);
            s = s.substring(0, index);

        }

        var last = s.charAt(s.length - 1);

        switch (last) {
            case 'y':

                // rays, convoys
                if (isConsonant(s.charAt(s.length - 2))) {
                    return s.slice(0, s.length - 1) + "ied" + rest;

                }
                // harpies, cries
                else {
                    return s + "ed" + rest;
                }
                break;
            case 'e':
                return s + "d" + rest;

                break;

            default:
                return s + "ed" + rest;
        };
    }
};

