var formLib = {

	about: "Библиотека для динамической проверки форм.\nАвтор: Денис Орлов 2012г.", 
	toString: function() {
		return this.about;
	},
	errorClass: "form_field_error", //имя класса для отображения ошибок


	/**
	 *    Проверка полей формы form по объекту правил rulesObj,
	 *    где ключ - имя поля, а значение, т.е. само правило, либо объект, либо строка - наименование поля (label)
	 *
	 *    Пример объекта и использования:
	 *    <code>
	 *        rulesObj = {
	 *		Name: {
	 *			label:'Имя',
	 *			required: 0, // необязательное: проверяется соответствие regexp только заполненного поля
	 *			regexp:/^[А-яЁёA-Za-z \-]+$/i
	 *			,e_message: 'только буквы, пробелы и тире'
	 *		},
	 *		Email: {
	 *			label:'Email',
	 *			required: 1, // обязательное: проверяется и заполненность поля и соответствие regexp,
	 *			regexp:/^([a-z0-9_\-]+\.)*[a-z0-9_\-]+@([a-z0-9][a-z0-9\-]*[a-z0-9]\.)+[a-z]{2,4}$/i
	 *               ,e_message: 'некорректный E-mail адрес'
	 *           },
	 *           Message:'Сообщение'// только строка наименование(label) поля
	 *       };
	 *       if( formLib.validateFields( someFormElement, rulesObj, formLib.outErrObj ) ) return false;
	 *    </code>
	 *    Логика проверки поля( вынесена в метод @see this.getFieldError ):
	 *    1.Eсли правило - строка, она содержит наименование поля и проверяется только его заполненость.
	 *    2.Eсли правило - объект, он должен содержать ключи типа:
	 *            label:'Имя', //наименование поля, попадает в сообшение об ошибке
	 *            required: 1, //обязательность поля, определяет логику проверки
	 *            regexp:/^[А-яЁёA-Za-z \-]+$/i, // регулярка для проверки методом regexp.test
	 *            e_message: 'только буквы, пробелы и тире' // сообщение при ошибке
	 *        если required, проверяется и заполненность поля и соответствие regexp,
	 *        если !required, проверяется соответствие regexp только заполненного поля
	 *    3.Ключ regexp может сам быть массивом объектов с ключами regexp и e_message, например
	 *        regexp:[
	 *            {regexp:/^[\s\S]{10,}$/, e_message: 'слишком короткое сообщение'}
	 *            ,{regexp:/^[\s\S]{10,250}$/, e_message: 'слишком длинное сообщение'}
	 *        ]
	 *    в этом случае проверяется массив до первого не соответствия, т.е. первые элементы-условия приоритетнее.
	 *    4.Правило-объект, может содержать ключ func:
	 *        func: function( form, rulesObj, elemName ){ ... }
	 *    Ключ func должен содержать функцию проверки, которая принимает form, rulesObj, elemName
	 *    и должна! возвращать string  - cообщение об ошибке или пустую строку,
	 *    для совместимости с return getFieldError, внутри которой она вызывается
	 *
	 *    Найденные ошибки собираются в объект e_obj, формат - имя_поля: сообщение об ошибке
	 *    @param form - проверяемая форма
	 *    @param rulesObj - объект правил для полей формы(см. пример выше)
	 *    @param outErrObjFunc - callback функция вывода ошибок которой будет передан объект e_obj и форма
	 *    @return объект e_obj или null, если ошибки не найдены
	 */
	validateFields: function( form, rulesObj, outErrObjFunc ) {
		//formLib.clearFormErrors( form );

		var e_obj = {}, e_cnt = 0;
		for( var key in rulesObj ) {
			var mess = formLib.getFieldError( form, rulesObj, key );
			if ( mess != '' ) {
				e_cnt++;
				e_obj[ key ] = mess;
			}
		}

		if ( e_cnt ) {
			if ( typeof outErrObjFunc == 'function' ) outErrObjFunc.call( window, e_obj, form );
			return e_obj;
		}
		return null;
	},

	/**
	 * Проверка поля key формы form по объекту rulesObj, логика: @see validateFields
	 *
	 * @param {HTMLElement}    form        проверяемая форма
	 * @param {Object}        rulesObj    объект правил для полей формы (@see validateFields)
	 * @param {String}        elemName    имя поля, он же и ключ в объекте полей rulesObj
	 * @return {String}        cообщение об ошибке или пустую строку
	 * @see validateFields
	 */
	getFieldError: function( form, rulesObj, elemName ) {
		var elem = form.elements[elemName] || null;
		if ( elem === null ) return '';

		var mess = '', MS = ' - ', requiredMess = 'обязательное поле', rule = rulesObj[elemName], val = elem.value, ph = elem.getAttribute( 'title' ); //вместо placeholder

		if ( typeof rule == 'object' ) {// объект со свойствами, проверяем досконально
			if ( (rule.required && val == '') || val == ph ) //(обязательное и пустое) или равно placeholder
				mess = rule.label + MS + requiredMess; else if ( rule.required || val != '' ) {// обязательное или ( необязательное и...) непустое
				if ( rule.regexp instanceof Array ) {
					for( var i = 0; i < rule.regexp.length; i++ )
						if ( !rule.regexp[i].regexp.test( val ) ) {
							mess = rule.label + MS + rule.regexp[i].e_message;
							break;
						}
				} else {
					if ( !rule.regexp.test( val ) ) mess = rule.label + MS + rule.e_message;
				}
				//
				if ( mess == '' && typeof rule.func == 'function' ) {
					var fmess = rule.func.call( window, form, rulesObj, elemName );
					if ( fmess != '' ) mess = rule.label + MS + fmess;
				}
			}
		} else // строка заголовка поля, проверяем только заполнено или нет
		if ( val == '' || val == ph ) {
			mess = rule + MS + requiredMess;
		}

		return mess;
	},

	/**
	 *    Вывод найденных ошибок алертом,
	 *    используется как callback функция в validateFields
	 *
	 *    @param e_obj - объект с ошибками, формат - имя_поля: сообщение об ошибке, @see validateFields
	 */
	alertErrObj: function( e_obj ) {
		var mess = '', key;
		for( key in e_obj ) mess += '\n   ' + e_obj[ key ];
		alert( 'Исправьте пожалуйста: ' + mess );
	},

	/**
	 *    Вывод найденных ошибок рядом с элементами формы с пом. метода outErr,
	 *    исп. как callback функция в validateFields
	 *
	 *    @param e_obj - объект с ошибками, @see validateFields
	 *    @param form  - форма
	 */
	outErrObj: function( e_obj, form ) {
		for( var key in e_obj ) formLib.outErr( form, key, e_obj[ key ] );
	},

	/**
	 *    Вывод строки ошибки рядом с элементом формы,
	 *    создает контейнер для строки с форматом ID : form.name+'_'+inpName+'_error',
	 *
	 *    @param form  - форма
	 *    @param inpName  - имя элемента
	 *    @param errorStr  - строка ошибки
	 */
	outErr: function( form, inpName, errorStr ) {

		var field, el, elErrId = form.name + '_' + inpName + '_error';

		if ( field = form.elements[ inpName ] ) {

			if ( el = document.getElementById( elErrId ) ) {
				// remove from DOM but not delete, course IE 7,8 appendChild + innerHTML = fail
				el.parentNode.removeChild( el );
			} else {
				el = document.createElement( 'div' );
				el.className = formLib.errorClass;
				el.id = elErrId;
			}

			el.innerHTML = errorStr;//newEl.appendChild( document.createTextNode(errorStr) );
			field.parentNode.appendChild( el );
		}
	},

	/**
	 *    Очистка элементов-ошибок формы
	 *    удаление элементов созданных методом outErr
	 *
	 *    @param form  - форма
	 */
	clearFormErrors: function( form ) {
		for( var i = 0; i < form.elements.length; i++ ) {
			var inpName = form.elements[i].name, elErr = document.getElementById( form.name + '_' + inpName + '_error' ) || null;
			//IE 7,8 appendChild+innerHTML=fail, can only innerHTML = ''
			if ( elErr != null ) elErr.parentNode.removeChild( elErr );//or elErr.innerHTML = ''; without collapsing in IE
		}
	},

	/**
	 *    Привязка проверки элементов формы методом getFieldError на событие onblur
	 *
	 *    @param form - проверяемая форма
	 *    @param rulesObj - объект правил для полей формы( @see validateFields     )
	 */
	bindCheckOnBlur: function( form, rulesObj ) {
		for( var key in rulesObj ) {
			var elem = form.elements[key] || null;
			if ( elem != null )
				elem.onfocus = function() {
					var hadValue = this.value;
					this.onblur = function() {
						//elem.onblur = function(){
						// чтобы не нервировать "ошибками" еще до попыток заполнения
						// если пустое, и было пустое, и оно обязательное( не объект или object.required ) выходим,
						if ( this.value == '' && hadValue == '' && ( typeof rulesObj[this.name] != 'object' || rulesObj[this.name].required ) ) return;
						// но реагируем на опустевшие необязательные, стирая "ошибки", и непустые обязательные
						var mess = formLib.getFieldError( form, rulesObj, this.name );
						formLib.outErr( form, this.name, mess );
					}
				}
		}
	},


	/**
	 *    Сборка тела запроса из значений элементов формы для отправки через AJAX
	 *
	 *    @param form  - форма
	 */
	getRequestBody: function( form ) {
		var aParams = new Array();
		for( var i = 0; i < form.elements.length; i++ ) {
			var sParam = encodeURIComponent( form.elements[i].name );
			sParam += "=";
			sParam += encodeURIComponent( form.elements[i].value );
			aParams.push( sParam );
		}
		return aParams.join( "&" );
	}
};