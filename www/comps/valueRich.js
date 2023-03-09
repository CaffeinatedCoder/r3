import {
	getAttributeFileThumbHref,
	getAttributeFileVersionHref
} from './shared/attribute.js';
import {
	getUnixFormat,
	getUtcTimeStringFromUnix
} from './shared/time.js';
import {
	colorAdjustBg,
	getHtmlStripped,
	getLinkMeta,
	openLink
} from './shared/generic.js';
export {MyValueRich as default};

let MyValueRich = {
	name:'my-value-rich',
	template:`<div class="value-rich"
		@focus="$emit('focus')"
		@click="$emit('trigger')"
		@keyup.space.enter="$emit('trigger')"
		:class="{ color:isColor, files:isFiles, wrap:wrap }"
		:style="style"
	>
		<!-- copy to clipboard action -->
		<my-button image="copyClipboard.png"
			v-if="clipboard && !isFiles && !isGallery"
			@trigger="copyToClipboard"
			:active="value !== null"
			:blockBubble="true"
			:captionTitle="capGen.button.copyClipboard"
			:naked="true"
		/>
		
		<!-- link open action -->
		<my-button
			v-if="isLink"
			@trigger="openLink(link.href,link.blank)"
			@trigger-middle="openLink(link.href,link.blank)"
			:active="value !== null"
			:blockBubble="true"
			:image="link.image"
			:naked="true"
		/>
		
		<!-- string value -->
		<span v-if="isString" :title="stringValueFull">
			{{ stringValue }}
		</span>
		
		<!-- files -->
		<a target="_blank"
			v-if="isFiles && !isGallery"
			v-for="f in files"
			:href="getAttributeFileVersionHref(attributeId,f.id,f.name,f.version,token)"
			:key="f.id"
		>
			<my-button image="download.png"
				:blockBubble="true"
				:caption="f.name.length < 18 ? f.name : f.name.substr(0,14)+'...'"
				:captionTitle="f.name"
				:naked="true"
			/>
		</a>
		
		<template v-if="isGallery">
			<img class="gallery-item"
				v-for="f in files"
				:src="getAttributeFileThumbHref(attributeId,f.id,f.name,f.version,token)"
				:style="styleGallery"
			/>
			
			<img class="gallery-item placeholder" src="images/noPic.png"
				v-if="files.length === 0"
				:style="styleGallery"
			/>
		</template>
	</div>`,
	props:{
		attributeId:{ type:String,  required:true },
		basis:      { type:Number,  required:false, default:0 },         // size basis (usually column width)
		clipboard:  { type:Boolean, required:false, default:false },     // copy-to-clipboard action
		display:    { type:String,  required:false, default:'default' }, // variant (url, gallery, password ...)
		length:     { type:Number,  required:false, default:0 },         // string length limit
		value:      { required:true },
		wrap:       { type:Boolean, required:false, default:false }      // wrap string value
	},
	emits:['clipboard','focus','trigger'],
	watch:{
		value:{
			handler() { this.setValue(); },
			immediate:true
		}
	},
	data() {
		return {
			isColor:false,
			isFiles:false,
			isGallery:false,
			isLink:false,
			isPassword:false,
			isString:false,
			stringValue:'',    // processed value, shown directly
			stringValueFull:'' // processed value, shown as title, no length limit
		};
	},
	computed:{
		files:(s) => !s.isFiles || s.value === null ? [] : s.value,
		link: (s) => !s.isLink || s.value === null ? false : s.getLinkMeta(s.display,s.value),
		
		// styles
		style:       (s) => !s.isColor ? '' : `background-color:${s.colorAdjustBg(s.value,s.settings.dark)}`,
		styleGallery:(s) => !s.isGallery || s.basis === 0 ? '' : `width:${s.basis}px;height:${s.basis}px;`,
		
		// store
		attributeIdMap:(s) => s.$store.getters['schema/attributeIdMap'],
		token:         (s) => s.$store.getters['local/token'],
		capGen:        (s) => s.$store.getters.captions.generic,
		settings:      (s) => s.$store.getters.settings
	},
	methods:{
		// externals
		colorAdjustBg,
		getAttributeFileThumbHref,
		getAttributeFileVersionHref,
		getHtmlStripped,
		getLinkMeta,
		getUnixFormat,
		getUtcTimeStringFromUnix,
		openLink,
		
		copyToClipboard() {
			navigator.clipboard.writeText(
				!this.isPassword ? this.stringValueFull : this.value
			);
			this.$emit('clipboard');
		},
		setValue() {
			let directValue = false;
			let atr = this.attributeIdMap[this.attributeId];
			switch(atr.content) {
				case 'boolean':
					this.stringValue = this.value ? this.capGen.option.yes : this.capGen.option.no;
					return this.isString = true;
				break;
				case 'files':
					this.isGallery = this.display === 'gallery';
					return this.isFiles = true;
				break;
				
				// text
				case 'text': // fallthrough
				case 'varchar':
					
					// handle different uses and display options
					switch(atr.contentUse) {
						case 'color': return this.isColor = true; break;
						case 'richtext':
							if(this.value !== null)
								this.stringValueFull = this.getHtmlStripped(this.value);
						break;
						default: directValue = true; break;
					}
					switch(this.display) {
						case 'password':
							this.isPassword      = true;
							this.stringValueFull = '**********';
							directValue = false;
						break;
						case 'email': // fallthrough
						case 'phone': // fallthrough
						case 'url':
							this.isLink = true;
						break;
					}
				break;
				
				// integers
				case 'integer': // fallthrough
				case 'bigint':
					switch(atr.contentUse) {
						case 'date':     this.stringValueFull = this.getUnixFormat(this.value,this.settings.dateFormat);          break;
						case 'datetime': this.stringValueFull = this.getUnixFormat(this.value,this.settings.dateFormat + ' H:i'); break;
						case 'time':     this.stringValueFull = this.getUtcTimeStringFromUnix(this.value);                        break;
						default:         directValue = true; break;
					}
				break;
				
				// others (numbers, UUID)
				default: directValue = true; break;
			}
			
			// only string values left
			this.isString = true;
			
			if(directValue && this.value !== null)
				this.stringValueFull = this.value;
			
			// set final string value with applied text length limit
			if(this.length !== 0 && this.stringValueFull.length > this.length)
				this.stringValue = `${this.stringValueFull.substring(0,this.length-3)}...`;
			else
				this.stringValue = this.stringValueFull;
		}
	}
};