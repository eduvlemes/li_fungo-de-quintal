
if(window.location.search.includes('testMode=true')){
    sessionStorage.setItem('testMode',true) 
}

if(sessionStorage.getItem('testMode')){
    $('body').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/themes/blitzer/jquery-ui.min.css">');
    $('body').append('<script src="https://cdn.jsdelivr.net/gh/jquery/jquery-ui/ui/i18n/datepicker-pt-BR.js"></script>');
    $('#formularioObservacao').closest('.caixa-sombreada').hide();
    $('<div class="caixa-sombreada borda-principal" id="apx_schedule"><legend class="titulo cor-secundaria">Agendamento</legend> <div class="row-fluid"> <div class="span6 control-group"> <label class="control-label font-bold" for="">Data da entrega</label> <div class="controls"> <input type="text" autoComplete="none" id="dt_entrega" required placeholder="Selecione..."> </div></div><div class="span6 control-group"> <label class="control-label font-bold" for="">Período da entrega</label> <div class="controls"> <select id="hr_entrega" required> <option value="">Escolha a data...</option> </select> </div></div></div><div class="row-fluid"> <div class="span12 control-group"> <label class="control-label font-bold" for="">Observações do pedido</label> <div class="controls"> <textarea id="formularioObservacoes_2" rows="5"> </textarea> </div></div></div></div>').insertBefore($('#formularioObservacao').closest('.caixa-sombreada'));
        
    let schedule = [];
    schedule.settings = [];
    schedule.functions = [];
    schedule.settings.apiUrl = "https://cmsfungodequintal-production.up.railway.app/api/";
    schedule.settings.token = "d0153ecb497cf375b1b9c0af7a50525b5089556ae934802b5791177c5135c78545ccbcedb195b2542e7fff944d866a39448d2470ed1605c1b18f4e7079717a9d31f97d9ee6aec669432eee57b0c0096a220008e8934a1080162cc860b7d77700f894a34fde0bac07d758e4f5f2e9d800e65e5d7521d7552d1bfea163c19aaf88";
    schedule.settings.agendamento = true;
    schedule.settings.id_loja_integrada = null;
    schedule.currentRule = null;

    schedule.functions.calcHours = function(date,minusTime){
        var agora = new Date(date);
        var horasASubtrair = minusTime;

        agora.setHours(agora.getHours() - horasASubtrair);

        if (agora.getHours() < 0) {
            agora.setDate(agora.getDate() - 1);
            agora.setHours(agora.getHours() + 23);
        }
        console.log(agora)
        return agora;
    };

    schedule.functions.convertTime = function(time){
        let [hour, minute] = time.split(":").slice(0, 2);
        let formattedHour = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
        return formattedHour
    };

    schedule.functions.apiCall = function(params,action){
        return $.ajax({
            url: schedule.settings.apiUrl + action + '?' + params,
            headers: {
            'Authorization': `Bearer ${schedule.settings.token}`
            }
        })
        .done(function(data) {
                return data;
            
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Erro:', textStatus, errorThrown);
            return false;        
        });
    };

    schedule.specialRules = schedule.functions.apiCall('populate=*','regras-prioritarias');

    schedule.functions.orderDetailsUpdate = function(){
        let txt = "";
        if($('#dt_entrega').length > 0){
            txt = txt + "Data da entrega: " + $('#dt_entrega').val() + '\n';
        }
        if($('#hr_entrega').length > 0){
            txt = txt +  "Período da entrega: " + $('#hr_entrega').val() + '\n';
            txt = txt +  "Horário da entrega: " + $('#hr_entrega').find('option:selected').attr('period_open') + '\n';
        }
        if($('#formularioObservacoes_2').length > 0){
            txt = txt +  "Observações: " + $('#formularioObservacoes_2').val() + '\n';
        }
        $('[name="cliente_obs"]').val(txt);

    };
    schedule.functions.datepicker = function(){    
        
            
        $('#dt_entrega, #hr_entrega, #formularioObservacoes_2').change(function(){
            schedule.functions.orderDetailsUpdate();
        });

        $('#dt_entrega').datepicker({
            beforeShowDay: function(date){
                //console.log(date);
                let day = date.getUTCDay();
                let validDate = new Date();
                validDate.setDate(validDate.getDate())
                let specialRules = schedule.specialRules.responseJSON && schedule.specialRules.responseJSON.data ? schedule.specialRules.responseJSON.data : false;
                let available_days = schedule.currentRule.filter(el => el.active == true && el.periods.length > 0).map(function(item){return item.day_of_week})
                
                let fdate = date.toISOString().substr(0, 10);
                
                let disabled_days = specialRules  ? specialRules.find(el => el.attributes.date == fdate && el.attributes.active && el.attributes.block_delivery) : false;
                
                

                // if(specialRules && specialRules.find(el => el.attributes.date == fdate && el.attributes.active && el.attributes.block_delivery)){
                //     console.log(specialRules.find(el => el.attributes.date == fdate))
                // }

                if (date < validDate){
                    return [false, ""];
                }else{
                    if(available_days.includes(day)){
                        //console.log('available:',day);
                        if(disabled_days){
                            //console.log('disabled:',day);
                            return [false,""];
                        }else{
                            let availablePeriods = schedule.currentRule.filter(el => el.active == true && el.periods.length > 0);
                            let estimatedDateTime = new Date(date)
                            let validatedPeriods = false
                            
                            $.each(availablePeriods, function(k, periods){
                                $.each(periods.periods, function(k, period){
                                    console.log(period)
                                    estimatedDateTime.setHours(period.estimated_time_start.slice(0,2))
                                    estimatedDateTime.setMinutes(period.estimated_time_start.slice(3,2))
            
                                    let limitDateTime = schedule.functions.calcHours(estimatedDateTime,period.schedule_until_hour)
                                    let currentDate = new Date()
                                    if(limitDateTime.getTime() > currentDate.getTime()){
                                        validatedPeriods = true
                                        return validatedPeriods    
                                    }
                                })                       
                            });
                            if(validatedPeriods){
                                return [true,""];
                            }
                            return [false, ""]
                            
                        }
                    }else{
                        return [false, ""]
                    }
                }
                
            },
            onSelect: function(dateText, dateObj){
                let dateString = dateText;
                let dateParts = dateString.split("/");
                let _date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
                let fdate = _date.toISOString().substr(0, 10);
                let day = _date.getUTCDay();
                
                //console.log(fdate)

                let dayRule = schedule.currentRule.find(el => el.active == true && el.day_of_week == day && el.periods.length > 0)
                
                let overrideRule = schedule.specialRules && schedule.specialRules.responseJSON && schedule.specialRules.responseJSON.data ? schedule.specialRules.responseJSON.data : false;
                if (overrideRule){
                    overrideRule = overrideRule.find(el => el.attributes.active && !el.attributes.block_delivery && el.attributes.date == fdate && (el.attributes.shipping_methods.data.length == 0 || el.attributes.shipping_methods.data.find(_el => parseInt(_el.attributes.id_loja_integrada) == schedule.settings.id_loja_integrada)));
                }
                //console.log(overrideRule);
                $('#hr_entrega').html('<option value="">Selecione...</option>');
                
                if(overrideRule){
                    $.each(overrideRule.attributes.periods, function(k, period){ 
                        $('#hr_entrega').append('<option value="'+ period.name +'" period_open="'+ schedule.functions.convertTime(period.estimated_time_start) +'" period_close="'+ schedule.functions.convertTime(period.estimated_time_end) +'">'+ period.name +' - '+ schedule.functions.convertTime(period.estimated_time_start) + ' às ' + schedule.functions.convertTime(period.estimated_time_end) + '</option>');                    
                    });
                }else{
                    if(dayRule){
                        let availablePeriods = [];
                        let estimatedDateTime = new Date(fdate);
                        estimatedDateTime.setDate(estimatedDateTime.getDate() + 1);
                        $.each(dayRule.periods, function(k, period){
                            //console.log(period)
                            estimatedDateTime.setHours(period.estimated_time_start.slice(0,2))
                            estimatedDateTime.setMinutes(period.estimated_time_start.slice(3,2))

                            //console.log(estimatedDateTime)
                            let limitDateTime = schedule.functions.calcHours(estimatedDateTime,period.schedule_until_hour)
                            let currentDate = new Date()
                            if(limitDateTime.getTime() > currentDate.getTime()){
                                availablePeriods.push(period)
                            }
                        });
                        //console.log(availablePeriods)
                        //$.each(dayRule.periods, function(k, period){ 
                        $.each(availablePeriods, function(k, period){ 
                            $('#hr_entrega').append('<option value="'+ period.name +'" period_open="'+ schedule.functions.convertTime(period.estimated_time_start) +'" period_close="'+ schedule.functions.convertTime(period.estimated_time_end) +'">'+ period.name +' - '+ schedule.functions.convertTime(period.estimated_time_start) + ' às ' + schedule.functions.convertTime(period.estimated_time_end) + '</option>');                    
                        });
                    }
                }
            }
        });
    };

    $('body').on('change','[name="forma_envio"]',function(){
        let me = $(this);
        schedule.settings.id_loja_integrada = me.val();
        $.ajax({
            url: schedule.settings.apiUrl + 'formas-de-envios' + '?' + 'filters[id_loja_integrada][$eq]='+ me.val()+'&populate[shipping_rules][populate][periods]=*',
            headers: {
            'Authorization': `Bearer ${schedule.settings.token}`
            }
        })
        .done(function(data) {
            schedule.currentRule = data.data[0].attributes.shipping_rules;
            schedule.functions.datepicker()    
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Erro:', textStatus, errorThrown);
            return false;        
        });
    })

    if($('.pagina-carrinho').length > 0){
        if(schedule.settings.agendamento == true){
            schedule.functions.datepicker();
        }
    }

    if($('.pagina-pedido-finalizado').length > 0){
        let order = [];
        order.num_pedido = $('.numero-pedido').first().text().trim();
        $('.caixa-info li b').each(function(){
            let txt = $(this).text();
            if(txt == "Seu nome:"){
                order.cliente = $(this).next('span').text().trim();
            }
            if(txt == "Endereço:"){
                order.endereco = $(this).next('span').text().trim();
            }
            if(txt == "Bairro:"){
                order.bairro = $(this).next('span').text().trim();
            }
            if(txt == "CEP:"){
                order.cep = $(this).next('span').text().trim();
            }  
        });
        $('legend').each(function(){
            let txt = $(this).text();
            if(txt == "Pagamento"){
                order.pagamento = $(this).next('ul').find('img').attr('alt').trim();
            }
            if(txt == "Entrega"){
                order.entrega = $(this).next('ul').find('img').length > 0 ? $(this).next('ul').find('img').attr('alt').trim() : $(this).next('ul').find('span').text().trim();
            }
            if(txt == "Mensagem"){
                let info = $(this).next('ul').html().replace('<li>','').replace('</li>','').split('<br>');
                order.observacoes = $(this).next('ul').html().replaceAll('<li>','').replaceAll('</li>','').replaceAll('<br>','\n').trim();
                $.each(info,function(k_, item_){
                    if(item_.trim().split(':')[0] == "Data da entrega"){
                        order.data_agendamento = item_.trim().split(':')[1].trim();
                    } 
                    if(item_.trim().split(':')[0] == "Período da entrega"){
                        order.periodo_agendamento = item_.trim().split(':')[1].trim();
                    } 
                    if(item_.trim().split(':')[0] == "Horário da entrega"){
                        order.schedule_open = item_.trim().split(':')[1].trim() + ':' + item_.trim().split(':')[2].trim();
                    } 
                });
            }        
        });
        console.log(order);    

        if(!sessionStorage.getItem('order_' + order.num_pedido)){
            let dateStr = order.data_agendamento;
            let timeStr = order.schedule_open;
            let [day, month, year] = dateStr.split('/');
            let [hour, minute] = timeStr.split(':');
            let date = new Date(Date.UTC(year, month - 1, day, hour, minute));

            // Crie a string da data formatada
            let formattedDate = date.toISOString().substr(0, 10);

            // Crie a string da hora formatada
            let formattedTime = date.toISOString().substr(11, 8);

            // Combine as duas strings usando o formato UTC
            let schedule_date_time = `${formattedDate}T${formattedTime}.000Z`;

            [day, month, year] = order.data_agendamento.split('/');
            let schedule_data_agendamento = year +"-"+month.padStart(2, '0')+"-"+day.padStart(2, '0');
            
            

            $.ajax({
                url: schedule.settings.apiUrl + 'agendamentos',
                type: 'post',
                headers: {
                'Authorization': `Bearer ${schedule.settings.token}`
                },
                data : {data :{
                    schedule_date: schedule_data_agendamento,
                    schedule_time: order.schedule_open + ':00.000',
                    description: order.observacoes,
                    client_name: order.cliente,
                    client_mail: window.dataLayer[0].email,
                    order_id: order.num_pedido,
                    schedule_date_time: schedule_date_time
                    }
                }
            })
            .done(function(data) {
                //console.log(data);
                sessionStorage.setItem('order_' + order.num_pedido, true);
            
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('Erro:', textStatus, errorThrown);
                return false;        
            });


        }
    }
}