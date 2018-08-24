// @AP 08/18
'use strict';

const {App} = require('jovo-framework');// Country and Postal Code
const config = {
    logging: true,
    db: {
        type: 'file',
        localDbFilename: 'db',
    },
};

const app = new App(config);
// Using the setter
app.enableLogging();
const movieData = require('../db/moviedata--cleaned.json'); 

let toTitleCase = function(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

let getMoviesSpeechStr = function(moviesJson, speech, lastMovieSeparator) {
  for (var i=0; i<moviesJson.length; i++) {
    if (i != moviesJson.length-1) {
      speech = speech + toTitleCase(moviesJson[i].title) + ", ";
    } else {
      speech = speech.slice(0, -2) + " " + lastMovieSeparator + " " + toTitleCase(moviesJson[i].title) + ".";
    }
  }
  return speech;
}

let getMovieByTitle = function(movieTitle) {
  return movieData.filter(
        function(data){ return data.title.toLowerCase() == movieTitle.toLowerCase() });
}

// let getTvShowByTitle = function(movieTitle) {
//   return showData.filter(
//         function(data){ return data.title.toLowerCase() == movieTitle.toLowerCase() });
// }

let getMoviesByActorGenre = function(moviesJson, actor, genre) {
  return moviesJson.filter(
    function(data) {
      if (data.info.actors == undefined || data.info.genres == undefined) {
        return false;
      }
      return data.info.actors.includes(actor.toLowerCase()) && data.info.genres.includes(genre.toLowerCase());
    }
  );
}

let getMoviesByActor = function(moviesJson, actor) {
  return moviesJson.filter(
    function(data) {
      if (data.info.actors == undefined) {
        return false;
      }
      return data.info.actors.includes(actor.toLowerCase());
    }
  );
}

let getMoviesByGenre = function(moviesJson, genre) {
  return moviesJson.filter(
    function(data) {
      if (data.info.genres == undefined) {
        return false;
      }
      return data.info.genres.includes(genre.toLowerCase());
    }
  );
}

let getMoviesByRunningTime = function(moviesJson, runningTimeSecs) {
  return;
}

let userHistory = function(requestData) {
  if (requestData.actor != '') {
    // find
    this.followUpState('Yes')
      .ask('You recently started watching ' + requestData.movies.unfinished  + '. Would you like to finish watching this?', 'Would you like to finish watching ' + requestData.movies.unfinished);
  }
}

let addMovieToUserHistory = function(movieData, userData) {
  // add here - for the purpose of being able to resume previous content
  let newViewing = {
    "title": movieData.title,
    "unfinished_viewing": true,
    "genres": movieData.info.genres,
    "actors": movieData.info.actors
  }
  if (userData.movies == undefined) {
    userData.movies = [newViewing]
  } else {
    userData.movies = userData.movies.push(newViewing)
  }
  return userData;

}


app.setHandler({
    'LAUNCH': function() {
      let speech = 'Hi, tv guru here! How can I be of service?';
      let reprompt = 'Please tell me what you would like to watch.';
      this.followUpState('InitialInteractionState')
            .ask(speech, reprompt);
    },

    'InitialInteractionState': {
      'StartGuruIntent': function(contentTitle) {
        console.log(contentTitle);
        if (contentTitle.value == undefined) {
          this.followUpState('InitialInteractionState')
            .ask('Would you like to watch a tv show or a film??', 'What would you prefer - a movie or a tv show?');
        } else {
          this.toStateIntent('MovieState', 'SearchMovieIntent', contentTitle);
        }
      },

      'MovieFormatIntent': function() {
        this.followUpState('MovieState')
          .ask('Is there a particular movie you would like to watch?', 'Any movie comes to mind?');
      },

      'TvShowFormatIntent': function() {
        this.followUpState('TvShowState')
          .ask('Is there a particular show you would like to watch?', 'Any show comes to mind?');
      },

      'Unhandled': function() {
        this.tell('Sorry, I didn\'t quite get that.');
      }

    },

    'KnowMovieNameState': {
      // does the user know the movie they want to watch? (yes) or do they want to 
      'YesIntent': function() {
        this.followUpState('MovieState')
          .ask('Okay great, what movie would you like to watch?')
      },
      'NoIntent': function() {
        this.followUpState('MovieState')     
            .ask('Ok, no problem. Is there a particular actor or genre you are interested in?', 'Any genre or actor you want to watch?');
      },
      'Unhandled': function() {
        this.toIntent('NoIntent');
      }
    },

    // user wants to watch a movie
    'MovieState': {
      // TODO: add in yes/no intents
      'SearchMovieIntent': function(movieTitle) {
          // if more than one movie of that name, ask for year
          if (movieTitle.value != undefined) {
            let movieObj = getMovieByTitle(movieTitle.value);
            if (movieObj.length > 0) { // if there is a movie of this title
              if (movieObj.length > 1) { // if more than one movie matches this title
                  let noMovies = movieObj.length;
                  let moviesYears = ""; // string of movie years to ask user to narrow down selection by year
                  for (var i=0; i<noMovies; i++) {
                    if (i != noMovies-1) {
                      moviesYears = moviesYears + movieObj[i].year + ", ";
                    } else {
                      moviesYears = moviesYears.slice(0, -2) + " or " + movieObj[i].year;
                    }
                  }
                  let speech = "There appears to be " + noMovies + " movies called " + movieTitle.value + ". Would you like to watch the " + moviesYears +" version?";
                  let reprompt = "Would you like to watch the " + moviesYears + " version?";
                  this.setSessionAttribute('moviesObj', movieObj);
                  this.setSessionAttribute('currMovieTitle', movieTitle.value)
                  this.followUpState('MovieState.NarrowDownState')
                      .ask(speech, reprompt);

              } else { // if only one movie matches this title
                movieObj = movieObj[0];
                this.tell('Playing ' + movieObj.title);
                this.setSessionAttribute('currSearch', {});
                this.user().data = addMovieToUserHistory(movieObj, this.user().data);
              }

            } else {
              this.followUpState('MovieState')
                .ask('We appear not to have ' + movieTitle.value + ' in our catalogue. Is there something else you would like to watch?', 'Can you suggest another title or genre of movie you would like to watch?');

            }
          } else {
            this.followUpState('MovieState')
                .ask('Sorry I didn\'t quite get that. Is there something else you would like to watch?', 'Can you suggest another title or genre of movie you would like to watch?');
          }


      },

      // more info needed to choose which movie to play
      'CheckIfMoreInfoNeededIntent': function(){
        let currSearch = this.getSessionAttribute('currSearch');
        let speech;
        if (currSearch != undefined && currSearch.length != 0) {
          if (currSearch.moviesJson.length == 1) {
            this.tell("Playing " + currSearch.moviesJson.title);

          } else if (currSearch.moviesJson.length <= 5) {
            speech = "I have found " + currSearch.moviesJson.length + " movies that match your criteria. These are: ";
            speech =  getMoviesSpeechStr(currSearch.moviesJson, speech, "and");
            speech = speech + "Which one would you like to watch?";
            this.followUpState('MovieState')
            .ask(speech, "Which one would you like to watch from " + getMoviesSpeechStr(currSearch.moviesJson, "", "and"));
          } else if (currSearch.actor == undefined) {
            this.followUpState("MovieState")
              .ask("What actor would you like to watch?")
          } else if (currSearch.genre == undefined) {
            this.followUpState("MovieState")
              .ask("What genre would you like to watch?")
          } else if (currSearch.releaseYear == undefined) {
            this.followUpState("MovieState")
              .ask("What year would you like to  watch a movie from?");
          } else {
            // TODO
            this.tell('Showing all movies I think you might like to watch');
          }
        }
      },

      'FilterByGenreIntent': function(genre){
        // TODO: check if f user has unfinished movie
        let currSearch = this.getSessionAttribute('currSearch');
        let moviesJson;
        if (currSearch != undefined && currSearch.moviesJson != undefined && currSearch.moviesJson.length > 0) {
          moviesJson = getMoviesByGenre(currSearch.moviesJson, genre.value);
        } else {
          currSearch = {};
          moviesJson = getMoviesByGenre(movieData, genre.value);
        }
        if (moviesJson.length == 0) {
            this.followUpState('MovieState')
              this.tell('Sorry, there are no movies of the genre ' + genre.value + '. Is there another genre you would like to watch?', 'Can\'t find any movies of that genre. Any other genres you\'re interested in?')

        } else {
          currSearch.moviesJson = moviesJson;
          currSearch.genre = genre.value;
          this.setSessionAttribute('currSearch', currSearch);
          this.toIntent('CheckIfMoreInfoNeededIntent');
        }
      },

      'FilterByActorIntent': function(actor){
        // TODO: check if f user has unfinished movie
        let currSearch = this.getSessionAttribute('currSearch');
        let moviesJson;
        if (currSearch != undefined && currSearch.moviesJson != undefined && currSearch.moviesJson.length > 0) {
          moviesJson = getMoviesByActor(currSearch.moviesJson, actor.value);
        } else {
          currSearch = {};
          moviesJson = getMoviesByActor(movieData, actor.value);
        }
        if (moviesJson.length == 0) {
            this.followUpState('FilterByActorIntent')
              this.tell('Sorry, there are no movies wtih ' + actor.value + '. Is there another actor\'s movie you would like to watch?', 'Can\'t find any movies of that genre. Any other genres you\'re interested in?')

        } else {
          currSearch.moviesJson = moviesJson;
          currSearch.actor = actor.value;
          this.setSessionAttribute('currSearch', currSearch);
          this.toIntent('CheckIfMoreInfoNeededIntent');
        }
      },

      'FilterByActorGenreIntent': function(actor, genre){
        if (actor.value != undefined && genre.value != undefined) {
          // search for movies with actor and genre
          let currSearch = this.getSessionAttribute('currSearch');
          let moviesJson;
          if (currSearch != undefined && currSearch.moviesJson != undefined && currSearch.moviesJson.length > 0) {
            moviesJson = getMoviesByActorGenre(currSearch.moviesJson, actor.value, genre.value);
          } else {
            currSearch = {};
            moviesJson = getMoviesByActorGenre(movieData, actor.value, genre.value);
          }
          if (moviesJson.length == 0) {
              this.followUpState('SearchGenreIntent')
                this.tell('Sorry, there are no ' + genre.value + ' movies wtih ' + actor.value + '. Is there another actor\'s movie you would like to watch?', 'Can\'t find any movies of that genre. Any other genres you\'re interested in?')

          } else {
            currSearch.moviesJson = moviesJson;
            currSearch.actor = actor.value;
            currSearch.genre = genre.value;
            this.setSessionAttribute('currSearch', currSearch);
            this.toIntent('CheckIfMoreInfoNeededIntent');
          }
        } else {
          this.followUpState('FilterByActorGenreIntent')
            .tell('Sorry, I didn\'t quite get that', 'Can you repeat what actor and genre you would like to watch please?');
        }
      },


      'NarrowDownState': {
        'NarrowDownByYearIntent': function(movieYear) {
          // narrows down multiple films of the same name by year
            let moviesJson = this.getSessionAttribute('moviesObj');
            for (var i; i<moviesJson.length; i++) { // need to check here!
              movieObj = moviesJson[i];
              if (item.year == movieYear.value) {
                this.user().data = addMovieToUserHistory(movieObj, this.user().data)
              }
            }
            this.tell('Playing the ' + movieYear.value + ' version of ' + this.getSessionAttribute('currMovieTitle'));
        }
      },

      'Unhandled': function() {
        this.followUpState('MovieState')
            .ask('Sorry, I didn\'t quite get that. Maybe try asking for a particualr genre or actor?', 'Sorry I didn\'t understand you. Can you ');
      }

    },

    // user wants to watch a tv show
    'TvShowState': {
      'SearchTVShowIntent': function(tvShow, episodeNo, seriesNo) {
          tvShow = tvShow.value;
          episodeNo = episodeNo.value;
          seriesNo = seriesNo.value;
          if (tvShow != undefined && episodeNo != undefined && seriesNo != undefined) {
              this.tell('Playing ' + tvShow + ',episode ' + episodeNo + 'from season ' + seriesNo);
              //
              // logic to display and play episode
              // logic to add viewing history to user's data
          } else if (tvShow !=undefined && episodeNo != undefined) {
              this.tell('Playing episode ' + episodeNo + ' of ' + tvShow)
          } else if (tvShow != undefined) {
            this.tell('Playing the next episode of ' + tvShow);
          }
      },

      'SearchByActorIntent': function(actor) {
          this.user().data.actor = actor;
          this.tell('Finding movies with' + actor.value);
          if(movies['actor'] > 8) {
            this.toIntent('AgeOfMovies', actor)
          }
      },

      'AgeOfMoviesIntent': function(actor) {
          this.tell('Would you like to watch ' + actor + '\'s newer movies or older ones?');
      }


    },

    'END': function() {
    // Triggered when a session ends abrupty or with AMAZON.StopIntent
      this.tell('Goodbye!');
    },


    'Unhandled': function() {
      let speech = 'Hey, is there some way I can help you find something to watch?';
      let reprompt = 'Please let me know if there\'s something you want to watch';
      this.followUpState('InitialInteractionState')
          .ask(speech, reprompt);
    }


});

module.exports.app = app;
