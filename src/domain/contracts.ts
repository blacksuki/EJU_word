export type StudyItem={id:string;kind:'word'|'phrase'|'form'|'pattern';surface:string;reading:string;baseForm:string;meaningZh:string;exampleJa:string;exampleZh:string;noteZh:string;topic:string;sources:{file:string;number:number;raw:string}[];audio:{listen:string;example:string}};
export type AudioAsset={id:string;itemId:string;role:'listen'|'example';url:string;status:'development_only'|'human_accepted';sha256:string};
export type StudyUnit={id:string;title:string;goal:string;itemIds:string[]};
export type ContentBundle={schemaVersion:1;version:string;purpose:'development_only'|'personal_study';humanAudioReview?:HumanAudioReview;units?:StudyUnit[];items:StudyItem[];assets:AudioAsset[]};

export type HumanAudioReview={id:string;method:'human_listening';reviewer:'user';reviewedOn:string;statement:string;assets:{id:string;sha256:string}[]};
