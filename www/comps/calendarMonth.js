import MyInputCollection        from './inputCollection.js';
import MyForm                   from './form.js';
import MyValueRich              from './valueRich.js';
import {srcBase64}              from './shared/image.js';
import {getCaption}             from './shared/language.js';
import {getStringFilled}        from './shared/generic.js';
import {getColumnIndexesHidden} from './shared/form.js';
import {
	getDateAtUtcZero,
	getDaysBetween,
	getUnixFromDate,
	isUnixUtcZero
} from './shared/time.js';
export {MyCalendarMonth as default};

let MyCalendarMonth = {
	name:'my-calendar-month',
	components:{
		MyInputCollection,
		MyValueRich
	},
	template:`<div class="calendar-month">
		
		<!-- header -->
		<div class="top lower">
			<div class="area nowrap">
				<my-button image="new.png"
					v-if="hasCreate"
					@trigger="$emit('open-form',[],[],false)"
					@trigger-middle="$emit('open-form',[],[],true)"
					:caption="capGen.button.new"
					:captionTitle="capGen.button.newHint"
				/>
			</div>
			
			<div class="area nowrap default-inputs">
				<img class="icon"
					v-if="iconId !== null"
					:src="srcBase64(iconIdMap[iconId].file)"
				/>
				<my-button image="pagePrev.png"
					@trigger="monthInput -= 1"
					:naked="true"
				/>
				<input class="selector date-input" type="text"
					v-model="yearInput"
				/>
				<select class="selector date-input" v-model="monthInput">
					<option value="0">01</option>
					<option value="1">02</option>
					<option value="2">03</option>
					<option value="3">04</option>
					<option value="4">05</option>
					<option value="5">06</option>
					<option value="6">07</option>
					<option value="7">08</option>
					<option value="8">09</option>
					<option value="9">10</option>
					<option value="10">11</option>
					<option value="11">12</option>
				</select>
				<my-button image="pageNext.png"
					@trigger="monthInput += 1"
					:naked="true"
				/>
			</div>
			
			<div class="area wrap default-inputs">
				<my-input-collection class="selector"
					v-for="c in collections"
					@update:modelValue="$emit('set-collection-indexes',c.collectionId,$event)"
					:collectionId="c.collectionId"
					:columnIdDisplay="c.columnIdDisplay"
					:key="c.collectionId"
					:modelValue="collectionIdMapIndexes[c.collectionId]"
					:multiValue="c.multiValue"
				/>
				
				<select class="selector"
					v-if="hasChoices"
					v-model="choiceIdInput"
				>
					<option v-for="c in choices" :value="c.id">
						{{ getCaption(c.captions.queryChoiceTitle,c.name) }}
					</option>
				</select>
				
				<my-button image="arrowInside.png"
					v-if="ics"
					@trigger="showIcs = !showIcs"
					:caption="!isMobile ? capApp.button.ics : ''"
					:captionTitle="capApp.button.icsHint"
				/>
				
				<my-button image="calendar.png"
					v-if="!isMobile"
					@trigger="goToToday()"
					:caption="!isMobile && !isInput ? capApp.today : ''"
					:captionTitle="capApp.todayHint"
				/>
				
				<slot name="days-slider" />
			</div>
		</div>
		
		<!-- optional headers -->
		<div class="header-optional ics default-inputs" v-if="showIcs">
			
			<div v-if="icsToken === ''" class="row gap">
				<input v-model="icsTokenName" :placeholder="capApp.icsTokenNameHint" />
				<my-button image="ok.png"
					@trigger="setIcsTokenFixed"
					:caption="capApp.button.icsPublish"
				/>
			</div>
			
			<template v-if="icsToken !== ''">
				<div class="row gap">
					<input :value="icsUrl" readonly />
					<my-button image="copyClipboard.png"
						@trigger="icsCopyToClipboard"
						:captionTitle="capGen.button.copyClipboard"
					/>
				</div>
				<p>{{ capApp.icsDesc }}</p>
			</template>
		</div>
		
		<div class="resultsWrap">
			<div class="results">
				<!-- week day header -->
				<div class="days">
					<div class="item" v-for="day in 7">{{ getWeekDayCaption(day-1) }}</div>
				</div>
				
				<!-- weeks -->
				<div class="week" v-for="week in 6">
					
					<!-- days -->
					<div class="day"
						v-for="day in 7"
						@click.exact="clickDay(((week-1)*7)+day-1,false,false)"
						@click.shift="clickDay(((week-1)*7)+day-1,true,false)"
						@click.middle.exact="clickDay(((week-1)*7)+day-1,false,true)"
						@click.middle.shift="clickDay(((week-1)*7)+day-1,true,true)"
						:class="getDayClasses(((week-1)*7)+day-1,day)"
					>
						<h1 class="noHighlight">{{ getDayNumber(((week-1)*7)+day-1) }}</h1>
						
						<!-- full day events -->
						<div class="event"
							@click="clickRecord($event,e.row,e.placeholder,false)"
							@click.middle="clickRecord($event,e.row,e.placeholder,true)"
							v-for="e in eventsByDay[((week-1)*7)+day-1].events.filter(v => v.fullDay || v.placeholder)"
							:class="{ first:e.entryFirst, last:e.entryLast, placeholder:e.placeholder, clickable:daysSelectable }"
						>
							<template v-if="!e.placeholder">
								<!-- border line -->
								<div class="background"
									:style="getColor('border-bottom-color',e.color)"
								></div>
								
								<!-- caption -->
								<span class="values"
									v-if="day === 1 || e.entryFirst"
									:style="getFullDayTextStyles(day,e)"
								>
									<template v-for="(v,i) in e.values">
										<my-value-rich class="context-calendar"
											v-if="v !== null"
											:attributeId="columns[i].attributeId"
											:basis="columns[i].basis"
											:bold="columns[i].styles.includes('bold')"
											:display="columns[i].display"
											:italic="columns[i].styles.includes('italic')"
											:key="i"
											:length="columns[i].length"
											:value="v"
										/>
									</template>
								</span>
								
								<!-- ending beam -->
								<div class="ending-beam"
									v-if="e.entryLast"
									:style="getColor('background-color',e.color)"
								></div>
							</template>
						</div>
						
						<!-- partial day events -->
						<div class="part"
							@click="clickRecord($event,e.row,false,false)"
							@click.middle="clickRecord($event,e.row,false,true)"
							v-for="e in eventsByDay[((week-1)*7)+day-1].events.filter(v => !v.fullDay && !v.placeholder)"
							:class="{ clickable:daysSelectable }"
						>
							<span :style="getColor('background-color',e.color)">
								{{ getPartCaption(e.date0) }}
							</span>
							
							<template v-for="(v,i) in e.values">
								<my-value-rich class="context-calendar"
									v-if="v !== null"
									:attributeId="columns[i].attributeId"
									:basis="columns[i].basis"
									:bold="columns[i].styles.includes('bold')"
									:display="columns[i].display"
									:italic="columns[i].styles.includes('italic')"
									:key="i"
									:length="columns[i].length"
									:wrap="true"
									:value="v"
								/>
							</template>
						</div>
					</div>
				</div>
			</div>
			
			<!-- inline form -->
			<my-form
				v-if="popUpFormInline !== null"
				@close="$emit('close-inline')"
				@record-deleted="$emit('reload')"
				@record-updated="$emit('reload')"
				@records-open="popUpFormInline.recordIds = $event"
				:attributeIdMapDef="popUpFormInline.attributeIdMapDef"
				:formId="popUpFormInline.formId"
				:hasHelp="false"
				:hasLog="false"
				:isPopUp="true"
				:isPopUpFloating="false"
				:moduleId="popUpFormInline.moduleId"
				:recordIds="popUpFormInline.recordIds"
				:style="popUpFormInline.style"
			/>
		</div>
	</div>`,
	props:{
		choiceId:   { required:false, default:null },
		choices:    { type:Array,   required:false, default:() => [] },
		columns:    { type:Array,   required:false, default:() => [] },
		collections:{ type:Array,   required:false, default:() => [] },
		collectionIdMapIndexes:{ type:Object, required:false, default:() => {return {}} },
		date:       { type:Date,    required:true },                    // selected date to work around
		date0:      { type:Date,    required:true },                    // start date of calendar
		date1:      { type:Date,    required:true },                    // end date of calendar
		dateSelect0:{ required:false, default:null },
		dateSelect1:{ required:false, default:null },
		iconId:     { required:false, default:null },
		fieldId:    { type:String,  required:false, default:'' },
		filters:    { type:Array,   required:false, default:() => [] },
		formLoading:{ type:Boolean, required:false, default:false },
		ics:        { type:Boolean, required:false, default:false },
		inputTime:  { type:Boolean, required:false, default:false },
		isInput:    { type:Boolean, required:false, default:false },
		hasColor:   { type:Boolean, required:false, default:false },    // color attribute exists
		hasCreate:  { type:Boolean, required:false, default:false },    // has action for creating new record
		hasOpenForm:{ type:Boolean, required:false, default:false },
		popUpFormInline:{ required:false, default:null },
		rows:       { type:Array,   required:false, default:() => [] }
	},
	emits:[
		'close-inline','day-selected','open-form','reload',
		'set-choice-id','set-collection-indexes','set-date'
	],
	data() {
		return {
			icsToken:'',
			icsTokenName:'',
			showIcs:false
		};
	},
	computed:{
		// inputs
		choiceIdInput:{
			get()  { return this.choiceId; },
			set(v) { this.$emit('set-choice-id',v); }
		},
		monthInput:{
			get() { return this.date.getMonth(); },
			set(v) {
				let d = new Date(this.date.valueOf());
				d.setDate(1); // set to 1st to add month correctly
				d.setMonth(v);
				this.$emit('set-date',d);
			}
		},
		yearInput:{
			get() { return this.date.getFullYear(); },
			set(v) {
				if(v.length !== 4) return;
				
				let d = new Date(this.date.valueOf());
				d.setFullYear(v);
				this.$emit('set-date',d);
			}
		},
		
		// event values arrive sorted by start date
		// they are processed for display on each day of the calendar
		eventsByDay:(s) => {
			let days = [];
			
			for(let i = 0; i < 42; i++) {
				days.push({ events:[] });
			}
			
			// each row is one event (partial day, full day or spanning multiple days)
			for(let i = 0, j = s.rows.length; i < j; i++) {
				
				let ev = {
					color:s.hasColor ? s.rows[i].values[2] : null,
					date0:s.rows[i].values[0],
					date1:s.rows[i].values[1],
					entryFirst:true,
					entryLast:false,
					fullDay:false,
					fullDaysLeft:0,
					placeholder:false,
					row:s.rows[i],
					values:[]
				};
				
				// add non-hidden values
				let values = s.hasColor ? s.rows[i].values.slice(3) : s.rows[i].values.slice(2);
				for(let x = 0, y = values.length; x < y; x++) {
					if(!s.columnIndexesHidden.includes(x))
						ev.values.push(values[x]);
				}
				
				// check for full day event (stored as UTC zero)
				// add timezone offset to display correctly on calendar
				// because DST can be different for each date, we must use their individual offsets
				if(s.isUnixUtcZero(ev.date0) && s.isUnixUtcZero(ev.date1)) {
					ev.date0 += new Date(ev.date0 * 1000).getTimezoneOffset() * 60;
					ev.date1 += new Date(ev.date1 * 1000).getTimezoneOffset() * 60;
					ev.fullDay = true;
					ev.fullDaysLeft = ((ev.date1 - ev.date0) / 86400)+1;
				}
				
				// calculate position from start of calendar
				let dEvent = new Date(ev.date0 * 1000);
				dEvent.setHours(0,0,0); // use midnight
				
				let fullDaysLeft  = ev.fullDaysLeft;
				let daysFromStart = s.getDaysBetween(s.date0,dEvent)+1;
				
				// show first event only if within calendar bounds
				// store position in case we have a multi day event
				let eventPosition;
				
				if(s.dayOffsetWithinBounds(daysFromStart)) {
					eventPosition = days[daysFromStart].events.length;
					days[daysFromStart].events.push(ev);
				}
				else {
					// if event started outside of calendar bounds, use position from first day
					eventPosition = days[0].events.length;
				}
				
				// event is less than 1 day, is only shown once
				if(!ev.fullDay)
					continue;
				
				// place following days
				while(true) {
					
					// check if event reaches into next day
					dEvent.setDate(dEvent.getDate()+1);
					if(dEvent.getTime() / 1000 > ev.date1)
						break;
					
					// get to next day
					daysFromStart++;
					fullDaysLeft--;
					
					// event is outside of bounds, skip
					if(!s.dayOffsetWithinBounds(daysFromStart))
						continue;
					
					// reset event position if it reaches into next week
					if(daysFromStart !== 0 && daysFromStart % 7 === 0)
						eventPosition = days[daysFromStart].events.length;
					
					// add placeholder events to fill empty line space
					while(days[daysFromStart].events.length < eventPosition) {
						days[daysFromStart].events.push({
							placeholder:true
						});
					}
					
					let evNext = JSON.parse(JSON.stringify(ev));
					evNext.entryFirst = false;
					evNext.fullDaysLeft = fullDaysLeft;
					days[daysFromStart].events.push(evNext);
				}
				
				// retroactively mark last day
				if(s.dayOffsetWithinBounds(daysFromStart))
					days[daysFromStart].events[days[daysFromStart].events.length-1].entryLast = true;
			}
			return days;
		},
		
		// helpers
		daysBefore:(s) => {
			let d = new Date(s.date.valueOf());
			d.setDate(1);
			return s.getDaysBetween(s.date0,d);
		},
		icsUrl:(s) => `${location.protocol}//${location.host}/ics/download/cal.ics`
			+ `?field_id=${s.fieldId}&login_id=${s.loginId}&token_fixed=${s.icsToken}`,
		
		// simple
		columnIndexesHidden:(s) => s.getColumnIndexesHidden(s.columns),
		daysAfter:          (s) => s.date1.getDate(),
		daysSelectable:     (s) => s.hasOpenForm || s.isInput,
		month:              (s) => s.date.getMonth(), // active month (0-11)
		hasChoices:         (s) => s.choices.length > 1,
		
		// stores
		attributeIdMap:(s) => s.$store.getters['schema/attributeIdMap'],
		iconIdMap:     (s) => s.$store.getters['schema/iconIdMap'],
		capApp:        (s) => s.$store.getters.captions.calendar,
		capGen:        (s) => s.$store.getters.captions.generic,
		isMobile:      (s) => s.$store.getters.isMobile,
		loginId:       (s) => s.$store.getters.loginId,
		settings:      (s) => s.$store.getters.settings
	},
	beforeCreate() {
		// import at runtime due to circular dependencies
		this.$options.components.MyForm = MyForm;
	},
	methods:{
		// externals
		getCaption,
		getColumnIndexesHidden,
		getDateAtUtcZero,
		getDaysBetween,
		getStringFilled,
		getUnixFromDate,
		isUnixUtcZero,
		srcBase64,
		
		// actions
		clickDay(dayOffset,shift,middleClick) {
			if(!this.daysSelectable) return;
			
			let d = new Date(this.date0.valueOf());
			d.setDate(d.getDate() + dayOffset);
			
			// dates are stored as UTC zero
			this.$emit('day-selected',this.getDateAtUtcZero(d),shift,middleClick);
		},
		clickRecord(event,row,placeholder,middleClick) {
			if(placeholder) return;
			
			// block clickDay() event (placeholders must bubble)
			event.stopPropagation();
			
			if(this.hasOpenForm)
				this.$emit('open-form',[row],[],middleClick);
		},
		goToToday() {
			// switch to current month if not there (to show 'today')
			let now = new Date();
			if(now.getMonth() !== this.date.getMonth()
				|| now.getFullYear() !== this.date.getFullYear()) {
				
				return this.$emit('set-date',now);
			}
			
			// if already on current month, select 'today'
			if(this.daysSelectable)
				this.$emit('day-selected',this.getDateAtUtcZero(now),false,false);
		},
		icsCopyToClipboard() {
			navigator.clipboard.writeText(this.icsUrl);
		},
		
		// presentation
		dayOffsetWithinBounds(day) {
			// currently, calendar is always 42 days
			return day >= 0 && day <= 41;
		},
		getPartCaption(date0) {
			let d = new Date(date0 * 1000);
			let h = this.getStringFilled(d.getHours(),2,"0");
			let m = this.getStringFilled(d.getMinutes(),2,"0");
			return `${h}:${m}`;
		},
		getColor(styleName,color) {
			if(color !== null) return `${styleName}:#${color};`;
			return '';
		},
		getDayClasses(dayOffset,day) {
			let cls = {};
			
			if(this.daysSelectable)
				cls.clickable = true;
			
			// today
			let now = new Date();
			cls.today = now.getMonth() === this.date.getMonth()
				&& now.getFullYear() === this.date.getFullYear()
				&& now.getDate() === dayOffset-this.daysBefore+1;
			
			// weekend day?
			if((this.settings.sundayFirstDow && (day === 1 || day === 7))
				|| (!this.settings.sundayFirstDow && (day === 6 || day === 7))) {
				
				cls.weekend = true;
			}
			
			// day outside of current month?
			if(dayOffset < this.daysBefore || dayOffset >= (42-this.daysAfter))
				cls.outside = true;
			
			// day selected
			if(this.dateSelect0 !== null && this.dateSelect1 !== null) {
				
				let dDay = new Date(this.date0.valueOf());
				dDay.setDate(dDay.getDate() + dayOffset);
				
				// use calendar day at UTC zero
				dDay = this.getDateAtUtcZero(dDay);
				
				// date selections are UTC zero, can be compared directly
				// datetime selections are not UTC zero, must be converted (also to remove DST issues)
				let dSelIsFullDay = this.isUnixUtcZero(this.getUnixFromDate(this.dateSelect0))
					&& this.isUnixUtcZero(this.getUnixFromDate(this.dateSelect1));
				
				let dSel0 = dSelIsFullDay ? this.dateSelect0 : this.getDateAtUtcZero(this.dateSelect0);
				let dSel1 = dSelIsFullDay ? this.dateSelect1 : this.getDateAtUtcZero(this.dateSelect1);
				
				if(dDay.valueOf() >= dSel0.valueOf() && dDay.valueOf() <= dSel1.valueOf())
					cls.selected = true;
			}
			return cls;
		},
		getFullDayTextStyles(dayInWeek,event) {
			// get maximum length of full day text
			// can span multiple days, if event has multiple days
			let days = event.fullDaysLeft;
			
			// week has 7 days, event can start on any of these days
			// can show text only until last day of week
			let maxDaysAvailable = 7 - dayInWeek + 1;
			
			if(maxDaysAvailable < days)
				days = maxDaysAvailable;
			
			// remove 10% for right padding
			return `max-width:${(days*100)-10}%;`;
		},
		getDayNumber(dayOffset) {
			let d = new Date(this.date0.valueOf());
			d.setDate(d.getDate()+(dayOffset));
			return d.getDate();
		},
		getWeekDayCaption(dayOffset) {
			
			if(!this.settings.sundayFirstDow) {
				dayOffset++;
				
				if(dayOffset === 7)
					dayOffset = 0;
			}
			
			if(this.isMobile || this.isInput)
				return this.capApp['weekDayShort'+dayOffset];
			
			return this.capApp['weekDay'+dayOffset];
		},
		
		// backend calls
		setIcsTokenFixed() {
			ws.send('login','setTokenFixed',{
				name:this.icsTokenName,
				context:'ics'
			},true).then(
				res => this.icsToken = res.payload.tokenFixed,
				this.$root.genericError
			);
		}
	}
};