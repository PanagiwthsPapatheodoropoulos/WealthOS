package com.wealthos.backend.common.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "wealthos.exchange";
    public static final String TRANSACTION_QUEUE = "wealthos.transactions";
    public static final String TRANSACTION_ROUTING_KEY = "transaction.completed";
    public static final String NOTIFICATION_QUEUE = "wealthos.notifications";
    public static final String NOTIFICATIONS_QUEUE = NOTIFICATION_QUEUE;
    public static final String NOTIFICATION_ROUTING_KEY = "notification.send";
    public static final String PORTFOLIO_PROJECTION_QUEUE = "wealthos.portfolio-projection";

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue transactionQueue() {
        return new Queue(TRANSACTION_QUEUE, true);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public Queue portfolioProjectionQueue() {
        return new Queue(PORTFOLIO_PROJECTION_QUEUE, true);
    }

    @Bean
    public Binding transactionBinding(Queue transactionQueue, DirectExchange exchange) {
        return BindingBuilder.bind(transactionQueue).to(exchange).with(TRANSACTION_ROUTING_KEY);
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, DirectExchange exchange) {
        return BindingBuilder.bind(notificationQueue).to(exchange).with(NOTIFICATION_ROUTING_KEY);
    }

    @Bean
    public Binding portfolioProjectionBinding(Queue portfolioProjectionQueue, DirectExchange exchange) {
        return BindingBuilder.bind(portfolioProjectionQueue).to(exchange).with("portfolio.projection");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
