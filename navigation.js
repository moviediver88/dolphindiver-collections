'use strict';
// Experimental stable-manifest navigation. Collection tiles are Stremio meta
// entries; their detail page offers a link to the WatchNest web interface.
const NAV_ID='dd_navigation';
const NAV_TYPE='series';
const collectionId=id=>'dd_collection_'+id;
const parseCollectionId=id=>/^dd_collection_([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/.exec(id)?.[1]||null;
function manifestCatalog(){return {id:NAV_ID,type:NAV_TYPE,name:'My WatchNest Collections',extra:[{name:'skip',isRequired:false}]};}
function tiles(collections){return collections.map(c=>({id:collectionId(c.id),type:NAV_TYPE,name:c.name,poster:'https://placehold.co/300x450/15243b/ffffff.png?text='+encodeURIComponent(c.name.slice(0,50)),description:'WatchNest collection',posterShape:'poster'}));}
function detail(collection,website){return {id:collectionId(collection.id),type:NAV_TYPE,name:collection.name,description:'This collection is managed in WatchNest. Open WatchNest to browse or edit titles. Stremio does not support dynamic subcatalogs from a static manifest.',links:[{name:'Open WatchNest',category:'website',url:website}],behaviorHints:{defaultVideoId:null}};}
module.exports={NAV_ID,NAV_TYPE,collectionId,parseCollectionId,manifestCatalog,tiles,detail};
