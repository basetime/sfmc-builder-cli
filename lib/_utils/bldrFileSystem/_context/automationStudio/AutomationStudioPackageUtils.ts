// /*
//   buildAutoSteps Function

//   @arr {array} - array of objects containing step type, objectID, and name
//   @returns steps array formatted as the Automations API requires
// */
// const buildAutoSteps = (steps: any[]) => {
//     var stepsOutput = [];

//     for(var i = 0; i < steps.length; i++) {
//       var auto = steps[i];
//       var type = auto.type;
//       let objectTypeId
//        //Set the SFMC objectTypeID based on the type of automation activity
//        if(type === "sendDefinitions"){
//           var objectTypeID = 42;
//         } else if (type === "queryDefinitions"){
//           var objectTypeID = 300;
//         } else if (type === "scriptActivities"){
//           var objectTypeID = 423;
//         } else if(type === "wait"){
//           var objectTypeID = 467;
//         }

//       if(type === "wait"){
//          var step = {
//           "stepNumber": i,
//           "activities": [
//             {
//               "name": auto.duration + " " + auto.durationType,
//               "objectTypeId": objectTypeID,
//               "displayOrder": 0,
//               "serializedObject": "{\"duration\":" + auto.duration + ",\"durationUnits\": \"" + auto.durationType + "\"}"
//             }
//           ]
//         }

//         stepsOutput.push(step)

//       } else {

//         var step = {
//           "stepNumber": i,
//           "activities": buildActivity(auto, type, objectTypeID)
//         }

//         stepsOutput.push(step)
//       }
//     }

//     return stepsOutput;
//   };

//   /*
//   buildActivity Function
//   @auto {object} - configuration for the automation
//   @key {string} - type of object being configured; sendDefinitions, scriptActivities, wait
//   @objectTypeID {number} - identifer for specific object type

//   @return {array} - array of built activites for steps
//   */
//   function buildActivity(auto, key, objectTypeID){
//       var activities = [];
//       var arr = auto[key]

//       for(var a = 0; a < arr.length; a++){
//           var step = arr[a]
//           var name = step.name;
//           var activityObjectID = step.activityObjectID;
//           var displayOrder = a + 1;
//           //All asset names have a limit of 63 chars
//           //If created name is different than concat name no asset will be found
//           if (name.length > 63) {
//             name = name.slice(0, 63)
//           }

//           var autoStep = {
//             "name": name,
//             "activityObjectId": activityObjectID,
//             "objectTypeId": objectTypeID,
//             "displayOrder": displayOrder
//           }

//           activities.push(autoStep)
//         }

//         return activities
//   }
