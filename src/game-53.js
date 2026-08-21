/* v14.2.2 QA — dynamic cargo accounting corrections */
fieldToolMassV50=function(){
 const selected=new Set(ensureFieldToolCarryV47());let kg=0;for(const id of selected){if(id==='lift'&&ensureFieldTeamV43().useVehicle)continue;kg+=FIELD_TOOL_MASS_V50[id]||0}return kg
};
const _unloadDynamicCargoV53=unloadDynamicCargoV52;
unloadDynamicCargoV52=function(home){_unloadDynamicCargoV53(home);saveGame(false)};
