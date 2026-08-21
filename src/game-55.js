/* v14.2.2 QA — cargo geometry compatibility corrections */
const _fixedOutboundMassV55=fixedOutboundMassV52;
fixedOutboundMassV52=function(){let kg=_fixedOutboundMassV55();const t=ensureFieldTeamV43(),selected=new Set(ensureFieldToolCarryV47());if(!t.useVehicle&&selected.has('cart')&&state.gear?.cart)kg=Math.max(0,kg-(FIELD_TOOL_MASS_V50.cart||0));return kg};
toolVolumeV54=function(){const selected=new Set(ensureFieldToolCarryV47()),t=ensureFieldTeamV43();let l=0;for(const id of selected){if(id==='lift'&&t.useVehicle)continue;if(id==='cart'&&!t.useVehicle&&state.gear?.cart)continue;l+=FIELD_TOOL_VOLUME_L_V54[id]||8}return l};
fieldTeamValidationV43=function(e){const v=_fieldTeamValidationV52(e),geo=dynamicCargoForecastV54(),issues=[...v.issues,...geo.issues];return {...v,cargoFlow:geo,cargoGeometry:geo,ok:issues.length===0,issues:[...new Set(issues)]}};
