import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Location } from '@angular/common';

import { FunctionPromiseService } from 'savvato-javascript-services'
import { QuestionService } from '../../_services/question.service';
import { AlertService } from '../../_services/alert.service';
import { TechProfileModelService } from '../../_services/tech-profile-model.service';

import { QuestionEditService } from '../_services/question-edit.service';

import { environment } from '../../../_environments/environment'

//
// This page presents a field to edit the question itself, and also a view of the tech profile, used to select lineItemLevel associations
// 

@Component({
  selector: 'app-question-edit',
  templateUrl: './question-edit.page.html',
  styleUrls: ['./question-edit.page.scss'],
})
export class QuestionEditPage implements OnInit {

	dirty = false;
	questionId = undefined;
	question = undefined;
	lilvassociations = undefined;
	isNew = true;

	funcKey = "qepg-getParams1";

	LINE_ITEM_ID_IDX = 0;
	LEVEL_IDX = 1;

	constructor(private _location: Location,
			    private _router: Router,
			    private _route: ActivatedRoute,
			    private _questionService: QuestionService,
			    private _questionEditService: QuestionEditService,
    			private _alertService: AlertService,
			    private _functionPromiseService: FunctionPromiseService) {

	}

	ngOnInit() {
		let self = this;

		self._route.params.subscribe((params) => {
			self.questionId = params['questionId'];

			self.question = {id: -1, text: ''};
			self.lilvassociations = []

			let tmp = self._questionEditService.getSetupFunc()();
			if (tmp) {
				self.lilvassociations.push([tmp['lineItemId'], tmp['levelNumber']]);
			}

			if (self.questionId) {
				self._questionService.getQuestionById(self.questionId).then((q) => {
					self.question = q;
					self.isNew = false;
				});

				self._questionService.getLineItemLevelAssociations(self.questionId).then((data: number[]) => {
					self.lilvassociations = data;
				})
			}

			self._functionPromiseService.initFunc(self.funcKey, () => {
				return new Promise((resolve, reject) => {
					resolve({
						getEnv: () => {
							return environment;
						},
						getColorMeaningString: () => {
							return "lightblue means someone of that skill level should be able to answer this question. Click on a cell to apply this question to that skill. Click again to clear it."
						},
						getBackgroundColor: (lineItemId, idx) => {
							if (self.getAssociatedLevel(lineItemId) === idx) {
								return "lightblue";
							} else {
								return "white";
							}
						},
						onLxDescriptionClick: (lineItemId, idx) => {
							let association = self.lilvassociations.find(
								(element) => { 
									return element[this.LINE_ITEM_ID_IDX] === lineItemId; 
								});

							if (association) {
								if (idx === association[this.LEVEL_IDX]) {
									// remove the association
									self.lilvassociations = self.lilvassociations.filter(
										(element) => { 
											return element[this.LINE_ITEM_ID_IDX] !== lineItemId; 
										});

								} else {
									// update the association
									association[this.LEVEL_IDX] = idx;
								}
							} else {
								// add a new association
								self.lilvassociations.push([lineItemId, idx]);
							}

							self.setDirty();
						}
					})
				})
			})
		});
	}

	isDirty() {
		return this.dirty;
	}

	setDirty() {
		this.dirty = true;
	}

	getQuestionText() {
		return this.question && this.question["text"];
	}

	onQuestionChange(evt) {
		this.question["text"] = evt.currentTarget.value;
		this.setDirty();
	}

	isSaveBtnAvailable() {
		return this.isDirty() && this.question && this.question['text'] && this.lilvassociations && this.lilvassociations.length > 0
	}

	onSaveBtnClicked() {
		if (this.isDirty() && this.question && this.lilvassociations) {
			this._questionService.save(this.question, this.lilvassociations).then(() => {
				this._location.back();
			});
		} else {
			this._location.back();
		}
	}

	onCancelBtnClicked() {
		let self = this;
		if (this.question['text'] && this.question['text'].length > 0 && this.isDirty()) {
			self._alertService.show({
				header: 'Save Changes?',
				message: "You made changes. Save 'em?",
				buttons: [
					{
						text: 'No', role: 'cancel', handler: () => {
							this._location.back();
						}
					}, {
						text: 'Yes', handler: () => {
							self.onSaveBtnClicked();
						}
					}
				]
			})

		} else {
			this._location.back();
		}
	}

	getDtimTechprofileComponentController() {
		return this._functionPromiseService.waitAndGet(this.funcKey, this.funcKey,  { })
	}

	getAssociatedLevel(lineItemId) {
		let assoc = (this.lilvassociations && this.lilvassociations.find((elem) => { return elem[this.LINE_ITEM_ID_IDX] === lineItemId; }));
		return assoc ? assoc[this.LEVEL_IDX] : -1;
	}
}
